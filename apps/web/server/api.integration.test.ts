import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import S3rver from 's3rver'
import { and, eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { getServerConfig } from '@voidmix/config/server'
import { jobs } from '@voidmix/db/schema'
import { runNextJob, type JobHandlers } from '@voidmix/jobs'
import { createApiClient } from '@voidmix/rpc/client'
import { createServices, type Services } from './services'
import { createHttpApp } from './hono'
const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL must point to a disposable database ending in _test')
let services: Services
let app: ReturnType<typeof createHttpApp>
let s3: S3rver
let directory: string
const origin = 'http://localhost:3000'
async function request(path: string, body?: unknown, token?: string, method = 'POST') {
  return app.request(origin + path, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
async function signup(email: string) {
  const response = await request('/api/auth/sign-up/email', {
    name: email.split('@')[0],
    email,
    password: 'LongTestPassword123!',
  })
  expect(response.status).toBe(200)
  const [mail] = await services.database.db
    .select()
    .from(jobs)
    .where(and(eq(jobs.name, 'send-email'), sql`payload->>'to' = ${email}`))
  const url = (mail.payload as { text: string }).text.match(/https?:\/\/\S+/)![0]
  const verified = await app.request(url, { headers: { Origin: origin } })
  expect([200, 302]).toContain(verified.status)
  const signin = await request('/api/auth/sign-in/email', {
    email,
    password: 'LongTestPassword123!',
  })
  expect(signin.status).toBe(200)
  return (await signin.json()).token as string
}
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'voidmix-s3-'))
  s3 = new S3rver({
    port: 0,
    address: '127.0.0.1',
    silent: true,
    directory,
    configureBuckets: [{ name: 'voidmix' }],
  })
  const address = await s3.run()
  const config = getServerConfig({
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: 'test-only-auth-secret-longer-than-32-chars',
    BETTER_AUTH_URL: origin,
    S3_BUCKET: 'voidmix',
    S3_REGION: 'us-east-1',
    S3_ENDPOINT: `http://127.0.0.1:${address.port}`,
    S3_ACCESS_KEY_ID: 'S3RVER',
    S3_SECRET_ACCESS_KEY: 'S3RVER',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    MAIL_FROM: 'hello@voidmix.local',
  })
  services = createServices(config)
  await services.database.pool.query(
    'drop schema if exists public cascade; create schema public; drop schema if exists drizzle cascade',
  )
  const migrationsFolder = fileURLToPath(new URL('../../../packages/db/drizzle', import.meta.url))
  await migrate(services.database.db, { migrationsFolder })
  await migrate(services.database.db, { migrationsFolder })
  app = createHttpApp(services)
})
afterAll(async () => {
  await services?.close()
  await s3?.close()
  if (directory) await rm(directory, { recursive: true, force: true })
})
describe('real PostgreSQL + auth + RPC + S3 lifecycle', () => {
  it('registers, verifies email, isolates files and revokes the session', async () => {
    const alice = await signup('alice@example.com')
    const bob = await signup('bob@example.com')
    const fetchApi: typeof fetch = async (input, init) => app.fetch(new Request(input, init))
    const api = createApiClient({ baseUrl: origin, getToken: async () => alice, fetch: fetchApi })
    expect((await api.me()).email).toBe('alice@example.com')
    expect(
      (await request('/api/files/init', { fileName: 'a.txt', contentType: 'text/plain', size: 3 }))
        .status,
    ).toBe(401)
    const response = await request(
      '/api/files/init',
      { fileName: 'a.txt', contentType: 'text/plain', size: 3 },
      alice,
    )
    expect(response.status).toBe(201)
    const init = await response.json()
    expect(response.headers.get('X-Request-Id')).toBeTruthy()
    const put = await fetch(init.uploadUrl, { method: 'PUT', headers: init.headers, body: 'abc' })
    expect(put.ok).toBe(true)
    expect((await request('/api/files/complete', { id: init.file.id }, bob)).status).toBe(404)
    expect((await request('/api/files/complete', { id: init.file.id }, alice)).status).toBe(200)
    expect((await request('/api/files/complete', { id: init.file.id }, alice)).status).toBe(200)
    expect((await api.files.list()).items).toHaveLength(1)
    const bobApi = createApiClient({ baseUrl: origin, getToken: async () => bob, fetch: fetchApi })
    expect((await bobApi.files.list()).items).toHaveLength(0)
    await fetch(init.uploadUrl, { method: 'PUT', headers: init.headers, body: 'xyz' })
    const download = await (
      await request('/api/files/download', { id: init.file.id }, alice)
    ).json()
    expect(await (await fetch(download.url)).text()).toBe('abc')
    expect((await request(`/api/files/${init.file.id}`, undefined, alice, 'DELETE')).status).toBe(
      204,
    )
    expect((await request('/api/files/download', { id: init.file.id }, alice)).status).toBe(409)
    expect((await request('/api/auth/sign-out', {}, alice)).status).toBe(200)
    await expect(api.me()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('blocks cross-origin mutations and reports dependency health', async () => {
    const response = await app.request(origin + '/api/auth/sign-in/email', {
      method: 'POST',
      headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).not.toBe('https://attacker.example')
    expect((await app.request(origin + '/health')).status).toBe(200)
    expect((await app.request(origin + '/ready')).status).toBe(200)
  })
  it('requires explicit device approval and redeems a device code only once', async () => {
    const token = await signup('desktop@example.com')
    const start = await request('/api/auth/device/code', { client_id: 'voidmix-desktop' })
    expect(start.status).toBe(200)
    const code = await start.json()
    const verified = await request(
      `/api/auth/device?user_code=${encodeURIComponent(code.user_code)}`,
      undefined,
      token,
      'GET',
    )
    expect(verified.status).toBe(200)
    const approved = await request('/api/auth/device/approve', { userCode: code.user_code }, token)
    expect(approved.status).toBe(200)
    const body = {
      client_id: 'voidmix-desktop',
      device_code: code.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }
    const redeemed = await request('/api/auth/device/token', body)
    expect(redeemed.status).toBe(200)
    const desktopToken = (await redeemed.json()).access_token
    expect(typeof desktopToken).toBe('string')
    expect((await request('/api/auth/device/token', body)).status).not.toBe(200)
    const session = await request('/api/auth/get-session', undefined, desktopToken, 'GET')
    expect((await session.json()).user.email).toBe('desktop@example.com')
    await request('/api/auth/sign-out', {}, desktopToken)
    expect(
      await (await request('/api/auth/get-session', undefined, desktopToken, 'GET')).json(),
    ).toBeNull()
  })
  it('persists jobs, avoids duplicate enqueue and recovers expired leases', async () => {
    await services.database.db.delete(jobs)
    await services.queue.enqueue('audit', { action: 'test', resource: 'one' }, { dedupeKey: 'one' })
    await services.queue.enqueue('audit', { action: 'test', resource: 'one' }, { dedupeKey: 'one' })
    await services.database.db
      .update(jobs)
      .set({ status: 'running', leaseUntil: new Date(0), leaseToken: crypto.randomUUID() })
    let processed = 0
    const handler = async () => {
      processed++
    }
    const handlers: JobHandlers = {
      'send-email': handler,
      audit: handler,
      'cleanup-upload': handler,
      'process-upload': handler,
      'delete-file': handler,
    }
    expect(await runNextJob(services.database.db, handlers)).toBe(true)
    expect(processed).toBe(1)
    expect(await runNextJob(services.database.db, handlers)).toBe(false)
    await services.queue.enqueue('audit', { action: 'fail', resource: 'two' })
    await runNextJob(services.database.db, {
      ...handlers,
      audit: async () => {
        throw new Error('secret must not be persisted')
      },
    })
    const [failed] = await services.database.db
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'pending'))
    expect(failed.attempts).toBe(1)
    expect(failed.lastError).not.toContain('secret')
    expect(failed.runAt.getTime()).toBeGreaterThan(Date.now())
  })
})
