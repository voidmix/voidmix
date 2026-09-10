import { createAuth } from '@voidmix/auth'
import { getServerConfig } from '@voidmix/config/server'
import { createDatabase } from '@voidmix/db'
import { createFileRepository } from '@voidmix/db/repositories'
import { createFileService } from '@voidmix/domain'
import { createJobQueue } from '@voidmix/jobs'
import { initializeLogging } from '@voidmix/observability'
import { createStorage } from '@voidmix/storage'
export function createServices(config = getServerConfig()) {
  initializeLogging()
  const database = createDatabase(config.DATABASE_URL)
  const queue = createJobQueue(database.db)
  const storage = createStorage(config)
  const auth = createAuth({
    db: database.db,
    config,
    sendEmail: (mail) => queue.enqueue('send-email', mail),
    audit: (event) => queue.enqueue('audit', event),
  })
  const files = createFileService(createFileRepository(database.db), storage, {
    maxBytes: config.UPLOAD_MAX_BYTES,
    audit: (event) => queue.enqueue('audit', event),
  })
  return {
    config,
    database,
    queue,
    storage,
    auth,
    files,
    async close() {
      await storage.dispose()
      await database.close()
    },
  }
}
export type Services = ReturnType<typeof createServices>
let services: Services | undefined
export function getServices() {
  return (services ??= createServices())
}
export async function closeServices() {
  const current = services
  services = undefined
  await current?.close()
}
