import { os, ORPCError, type RouterClient } from '@orpc/server'
import { z } from 'zod'
import { pageInput, filePageSchema, sessionUserSchema, type SessionUser } from '@voidmix/contracts'
import { AppError, type FileService } from '@voidmix/domain'
import type { Logger } from '@voidmix/observability'
export interface RpcContext {
  user: SessionUser | null
  requestId: string
  logger: Logger
  files: FileService
}
const procedure = os.$context<RpcContext>().use(async ({ next, context }) => {
  try {
    return await next()
  } catch (error) {
    if (error instanceof AppError)
      throw new ORPCError(error.code, {
        message: error.message,
        data: { requestId: context.requestId },
      })
    if (error instanceof ORPCError) throw error
    context.logger.error('RPC failed', {
      errorType: error instanceof Error ? error.name : 'Unknown',
    })
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Request failed',
      data: { requestId: context.requestId },
    })
  }
})
const authenticated = procedure.use(({ context, next }) => {
  if (!context.user)
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Sign in to continue',
      data: { requestId: context.requestId },
    })
  if (!context.user.emailVerified)
    throw new ORPCError('FORBIDDEN', {
      message: 'Verify your email first',
      data: { requestId: context.requestId },
    })
  return next({ context: { user: context.user } })
})
export const router = {
  ping: procedure
    .output(z.object({ message: z.literal('pong') }))
    .handler(() => ({ message: 'pong' as const })),
  me: authenticated.output(sessionUserSchema).handler(({ context }) => context.user),
  files: {
    list: authenticated
      .input(pageInput)
      .output(filePageSchema)
      .handler(({ input, context }) => context.files.list(context.user.id, input)),
  },
}
export type ApiClient = RouterClient<typeof router>
