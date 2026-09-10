import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { RPCHandler } from '@orpc/server/fetch'
import { z } from 'zod'
import { trustedOrigins } from '@voidmix/config/server'
import {
  apiError,
  errorStatus,
  fileIdInput,
  uploadInput,
  type ErrorCode,
  type SessionUser,
} from '@voidmix/contracts'
import { consumeRateLimit } from '@voidmix/db/repositories'
import { AppError } from '@voidmix/domain'
import { createLogger, type Logger } from '@voidmix/observability'
import { router } from '@voidmix/rpc'
import type { Services } from './services'
type Variables = { requestId: string; logger: Logger; nonce: string; user: SessionUser }
const unsafe = (method: string) => !['GET', 'HEAD', 'OPTIONS'].includes(method)
export function createHttpApp(
  services: Services,
  render: (request: Request, nonce: string) => Promise<Response> | Response = () =>
    new Response('Not found', { status: 404 }),
) {
  const app = new Hono<{ Variables: Variables }>()
  const origins = trustedOrigins(services.config)
  const rpc = new RPCHandler(router)
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID()
    const nonce = crypto.randomUUID().replaceAll('-', '')
    const trace = c.req
      .header('traceparent')
      ?.match(/^00-([a-f0-9]{32})-[a-f0-9]{16}-[a-f0-9]{2}$/)?.[1]
    const logger = createLogger({ requestId, traceId: trace || requestId.replaceAll('-', '') })
    c.set('requestId', requestId)
    c.set('logger', logger)
    c.set('nonce', nonce)
    c.header('X-Request-Id', requestId)
    c.header('Cache-Control', 'no-store')
    const started = performance.now()
    try {
      await next()
    } finally {
      logger.set({
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round(performance.now() - started),
      })
      logger.emit()
    }
  })
  app.use('*', secureHeaders({ referrerPolicy: 'same-origin', crossOriginEmbedderPolicy: false }))
  app.use('*', async (c, next) => {
    const production = services.config.NODE_ENV === 'production'
    const script = production
      ? `'nonce-${c.get('nonce')}' 'strict-dynamic'`
      : "'self' 'unsafe-inline' 'unsafe-eval'"
    const storageOrigin = new URL(services.config.S3_ENDPOINT).origin
    c.header(
      'Content-Security-Policy',
      `default-src 'self'; script-src ${script}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ${storageOrigin}${production ? '' : ' ws: wss:'}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
    )
    await next()
  })
  app.use(
    '/api/*',
    cors({
      origin: (origin) => (origins.includes(origin) ? origin : ''),
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['X-Request-Id'],
    }),
  )
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: 64 * 1024,
      onError: () => {
        throw new AppError('BAD_REQUEST', 'Request body is too large')
      },
    }),
  )
  app.use('/api/*', async (c, next) => {
    if (unsafe(c.req.method)) {
      const origin = c.req.header('origin')
      if (origin && !origins.includes(origin))
        throw new AppError('FORBIDDEN', 'Origin is not allowed')
      if (!origin && c.req.header('cookie') && !c.req.header('authorization'))
        throw new AppError('FORBIDDEN', 'Cookie requests require an Origin header')
    }
    await next()
  })
  app.onError((error, c) => {
    let code: ErrorCode = 'INTERNAL_SERVER_ERROR'
    let message = 'Request failed'
    if (error instanceof AppError) {
      code = error.code
      message = error.message
    } else if (error instanceof z.ZodError || error instanceof SyntaxError) {
      code = 'BAD_REQUEST'
      message = 'Invalid request input'
    }
    if (code === 'INTERNAL_SERVER_ERROR')
      c.get('logger').error('Request failed', { errorType: error.name })
    return new Response(
      JSON.stringify({ error: apiError.parse({ code, message, requestId: c.get('requestId') }) }),
      { status: errorStatus[code], headers: { 'Content-Type': 'application/json' } },
    )
  })
  app.get('/health', (c) => c.json({ status: 'ok' }))
  app.get('/ready', async (c) => {
    try {
      await Promise.all([
        services.database.pool.query('select 1 from users limit 1'),
        services.storage.check(),
      ])
      return c.json({ status: 'ready' })
    } catch {
      throw new AppError('SERVICE_UNAVAILABLE', 'A required dependency is unavailable')
    }
  })
  app.get('/api/config', (c) =>
    c.json({
      githubEnabled: Boolean(services.config.OAUTH_GITHUB_CLIENT_ID),
      maxUploadBytes: services.config.UPLOAD_MAX_BYTES,
    }),
  )
  app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
    // Keep Better Auth's protocol intact so its client, OAuth and device grants remain compatible.
    const response = await services.auth.handler(c.req.raw)
    if (
      response.status >= 400 &&
      response.headers.get('content-type')?.includes('application/json')
    ) {
      const body = (await response.json()) as Record<string, unknown>
      if (response.status >= 500) {
        body.message = 'Authentication failed'
        body.error_description = 'Authentication failed'
        c.get('logger').error('Authentication failed')
      }
      const code: ErrorCode =
        response.status === 401
          ? 'UNAUTHORIZED'
          : response.status === 403
            ? 'FORBIDDEN'
            : response.status === 429
              ? 'TOO_MANY_REQUESTS'
              : response.status >= 500
                ? 'INTERNAL_SERVER_ERROR'
                : 'BAD_REQUEST'
      return new Response(
        JSON.stringify({
          ...body,
          requestId: c.get('requestId'),
          errorEnvelope: {
            code,
            message:
              response.status >= 500
                ? 'Authentication failed'
                : String(body.message ?? body.error_description ?? 'Authentication failed'),
            requestId: c.get('requestId'),
          },
        }),
        { status: response.status, headers: response.headers },
      )
    }
    return response
  })
  app.use('/api/files/*', async (c, next) => {
    const session = await services.auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw new AppError('UNAUTHORIZED', 'Sign in to continue')
    if (!session.user.emailVerified) throw new AppError('FORBIDDEN', 'Verify your email first')
    c.set('user', session.user)
    c.get('logger').set({ userId: session.user.id })
    const rate = await consumeRateLimit(services.database.db, `files:${session.user.id}`, 60, 60)
    if (!rate.allowed) {
      c.header('Retry-After', String(rate.retryAfter))
      throw new AppError('TOO_MANY_REQUESTS', 'Try again later')
    }
    await next()
  })
  app.post('/api/files/init', async (c) =>
    c.json(
      await services.files.initialize(c.get('user').id, uploadInput.parse(await c.req.json())),
      201,
    ),
  )
  app.post('/api/files/complete', async (c) =>
    c.json(
      await services.files.complete(
        c.get('user').id,
        fileIdInput.parse(await c.req.json()).id,
        c.get('requestId'),
      ),
    ),
  )
  app.post('/api/files/download', async (c) =>
    c.json(
      await services.files.download(
        c.get('user').id,
        fileIdInput.parse(await c.req.json()).id,
        c.get('requestId'),
      ),
    ),
  )
  app.delete('/api/files/:id', async (c) => {
    await services.files.remove(
      c.get('user').id,
      fileIdInput.parse({ id: c.req.param('id') }).id,
      c.get('requestId'),
    )
    return c.body(null, 204)
  })
  app.all('/api/rpc/*', async (c) => {
    const session = await services.auth.api.getSession({ headers: c.req.raw.headers })
    if (session) c.get('logger').set({ userId: session.user.id })
    const result = await rpc.handle(c.req.raw, {
      prefix: '/api/rpc',
      context: {
        user: session?.user ?? null,
        requestId: c.get('requestId'),
        logger: c.get('logger'),
        files: services.files,
      },
    })
    return result.matched
      ? result.response
      : c.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Procedure not found',
              requestId: c.get('requestId'),
            },
          },
          404,
        )
  })
  app.all('/api/*', (c) =>
    c.json(
      {
        error: { code: 'NOT_FOUND', message: 'Endpoint not found', requestId: c.get('requestId') },
      },
      404,
    ),
  )
  app.all('*', (c) => render(c.req.raw, c.get('nonce')))
  return app
}
