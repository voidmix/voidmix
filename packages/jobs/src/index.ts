import { and, eq, lt, sql } from 'drizzle-orm'
import type { Database } from '@voidmix/db'
import { jobs } from '@voidmix/db/schema'
import { jobSchemas, type JobName, type JobPayload } from '@voidmix/contracts'
export interface JobQueue {
  enqueue<N extends JobName>(
    name: N,
    payload: JobPayload<N>,
    options?: { dedupeKey?: string; runAt?: Date },
  ): Promise<void>
}
export type JobHandlers = { [N in JobName]: (payload: JobPayload<N>, id: string) => Promise<void> }
export function createJobQueue(db: Database): JobQueue {
  return {
    async enqueue(name, payload, options) {
      await db
        .insert(jobs)
        .values({ name, payload: jobSchemas[name].parse(payload), ...options })
        .onConflictDoNothing()
    },
  }
}
export async function runNextJob(db: Database, handlers: JobHandlers): Promise<boolean> {
  const token = crypto.randomUUID()
  const result = await db.execute<{
    id: string
    name: JobName
    payload: unknown
    attempts: number
  }>(sql`
    update jobs set status = 'running', attempts = attempts + 1, lease_until = now() + interval '60 seconds', lease_token = ${token}::uuid, updated_at = now()
    where id = (select id from jobs where (status = 'pending' and run_at <= now()) or (status = 'running' and lease_until < now()) order by run_at for update skip locked limit 1)
    returning id, name, payload, attempts`)
  const job = result.rows[0]
  if (!job) return false
  const owned = and(eq(jobs.id, job.id), eq(jobs.leaseToken, token))
  const heartbeat = setInterval(() => {
    void db
      .update(jobs)
      .set({ leaseUntil: new Date(Date.now() + 60_000) })
      .where(owned)
      .catch(() => {})
  }, 20_000)
  try {
    if (job.attempts > 5) throw new Error('Retry budget exhausted')
    const payload = jobSchemas[job.name]?.parse(job.payload)
    if (!payload) throw new Error('Unknown job')
    const handler = handlers[job.name] as (payload: unknown, id: string) => Promise<void>
    await handler(payload, job.id)
    // Clear mail tokens and other payload data after processing; keep the dedupe key.
    await db
      .update(jobs)
      .set({
        status: 'completed',
        payload: {},
        leaseUntil: null,
        leaseToken: null,
        updatedAt: new Date(),
      })
      .where(owned)
  } catch {
    await db
      .update(jobs)
      .set({
        status: job.attempts >= 5 ? 'failed' : 'pending',
        lastError: 'Job processing failed',
        leaseUntil: null,
        leaseToken: null,
        runAt: new Date(Date.now() + Math.min(60_000, 1000 * 2 ** job.attempts)),
        updatedAt: new Date(),
      })
      .where(owned)
  } finally {
    clearInterval(heartbeat)
  }
  return true
}
export async function pruneCompletedJobs(db: Database) {
  await db
    .delete(jobs)
    .where(
      and(eq(jobs.status, 'completed'), lt(jobs.updatedAt, new Date(Date.now() - 30 * 86_400_000))),
    )
}
