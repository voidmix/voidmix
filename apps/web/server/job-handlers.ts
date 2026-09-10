import { eq } from 'drizzle-orm'
import { auditLogs, files } from '@voidmix/db/schema'
import type { JobHandlers } from '@voidmix/jobs'
import type { Services } from './services'
export function createJobHandlers(
  services: Services,
  sendEmail: (mail: { to: string; subject: string; text: string }, id: string) => Promise<void>,
): JobHandlers {
  const { database, storage } = services
  return {
    async 'send-email'(payload, id) {
      await sendEmail(payload, id)
    },
    async audit(event, id) {
      await database.db
        .insert(auditLogs)
        .values({ id, ...event })
        .onConflictDoNothing()
    },
    async 'cleanup-upload'({ key }) {
      await storage.deleteObject(key)
    },
    async 'process-upload'({ id }) {
      const [file] = await database.db.select().from(files).where(eq(files.id, id))
      if (!file || file.status !== 'ready') return
      const object = await storage.stat(file.objectKey)
      if (!object || object.size !== file.size) throw new Error('Stored object is missing')
    },
    async 'delete-file'({ id }) {
      const [file] = await database.db.select().from(files).where(eq(files.id, id))
      if (!file || file.status === 'deleted') return
      await storage.deleteObject(file.objectKey)
      await storage.deleteObject(file.stagingKey)
      await database.db
        .update(files)
        .set({ status: 'deleted', updatedAt: new Date() })
        .where(eq(files.id, id))
    },
  }
}
