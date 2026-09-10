import { and, desc, eq, lt, ne, sql } from 'drizzle-orm'
import { AppError, toFileDto, type FileRecord, type FileRepository } from '@voidmix/domain'
import type { Database } from './index'
import { auditLogs, files, jobs, requestLimits } from './schema'
const record = (row: typeof files.$inferSelect): FileRecord => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
})
export function createFileRepository(db: Database): FileRepository {
  return {
    async create(file) {
      await db.insert(files).values({ ...file, createdAt: new Date(file.createdAt) })
    },
    async find(id, ownerId) {
      const [row] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, id), eq(files.ownerId, ownerId)))
      return row && record(row)
    },
    async list(ownerId, input) {
      let cursor: { createdAt: string; id: string } | undefined
      if (input.cursor) {
        try {
          cursor = JSON.parse(Buffer.from(input.cursor, 'base64url').toString())
        } catch {
          throw new AppError('BAD_REQUEST', 'Invalid pagination cursor')
        }
        if (
          !cursor ||
          !/^[0-9a-f-]{36}$/i.test(cursor.id) ||
          !Number.isFinite(Date.parse(cursor.createdAt))
        )
          throw new AppError('BAD_REQUEST', 'Invalid pagination cursor')
      }
      const rows = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.ownerId, ownerId),
            ne(files.status, 'deleted'),
            cursor
              ? sql`(${files.createdAt}, ${files.id}) < (${new Date(cursor.createdAt)}, ${cursor.id}::uuid)`
              : undefined,
            input.filter?.contentType ? eq(files.contentType, input.filter.contentType) : undefined,
          ),
        )
        .orderBy(desc(files.createdAt), desc(files.id))
        .limit(input.limit + 1)
      const items = rows.slice(0, input.limit).map((row) => toFileDto(record(row)))
      const last = items.at(-1)
      return {
        items,
        nextCursor:
          rows.length > input.limit && last
            ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString(
                'base64url',
              )
            : undefined,
      }
    },
    async complete(file, requestId) {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .update(files)
          .set({ status: 'ready', updatedAt: new Date() })
          .where(
            and(
              eq(files.id, file.id),
              eq(files.ownerId, file.ownerId),
              eq(files.status, 'pending'),
            ),
          )
          .returning()
        if (!row) {
          const [existing] = await tx.select().from(files).where(eq(files.id, file.id))
          if (existing?.status === 'ready') return record(existing)
          throw new AppError('CONFLICT', 'File state changed')
        }
        await tx
          .insert(jobs)
          .values([
            { name: 'process-upload', payload: { id: file.id }, dedupeKey: `process:${file.id}` },
            {
              name: 'cleanup-upload',
              payload: { key: file.stagingKey },
              dedupeKey: `staging:${file.id}`,
              runAt: new Date(Date.now() + 6 * 60_000),
            },
          ])
          .onConflictDoNothing()
        await tx
          .insert(auditLogs)
          .values({ actorId: file.ownerId, action: 'file.complete', resource: file.id, requestId })
        return record(row)
      })
    },
    async remove(file, requestId) {
      await db.transaction(async (tx) => {
        const changed = await tx
          .update(files)
          .set({ status: 'deleting', updatedAt: new Date() })
          .where(
            and(
              eq(files.id, file.id),
              eq(files.ownerId, file.ownerId),
              ne(files.status, 'deleting'),
              ne(files.status, 'deleted'),
            ),
          )
          .returning()
        if (!changed.length) return
        await tx
          .insert(jobs)
          .values({ name: 'delete-file', payload: { id: file.id }, dedupeKey: `delete:${file.id}` })
          .onConflictDoNothing()
        await tx
          .insert(auditLogs)
          .values({ actorId: file.ownerId, action: 'file.delete', resource: file.id, requestId })
      })
    },
  }
}
export async function consumeRateLimit(
  db: Database,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const now = new Date()
  const reset = new Date(now.getTime() + windowSeconds * 1000)
  const [row] = await db
    .insert(requestLimits)
    .values({ key, count: 1, resetAt: reset })
    .onConflictDoUpdate({
      target: requestLimits.key,
      set: {
        count: sql`case when ${requestLimits.resetAt} <= ${now} then 1 else ${requestLimits.count} + 1 end`,
        resetAt: sql`case when ${requestLimits.resetAt} <= ${now} then ${reset} else ${requestLimits.resetAt} end`,
      },
    })
    .returning()
  return {
    allowed: row.count <= limit,
    retryAfter: Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
  }
}
export async function cleanupRequestLimits(db: Database) {
  await db.delete(requestLimits).where(lt(requestLimits.resetAt, new Date()))
}
