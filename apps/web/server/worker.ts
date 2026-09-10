import { and, eq, lt } from 'drizzle-orm'
import nodemailer from 'nodemailer'
import { files } from '@voidmix/db/schema'
import { cleanupRequestLimits } from '@voidmix/db/repositories'
import { runNextJob, pruneCompletedJobs } from '@voidmix/jobs'
import { createLogger } from '@voidmix/observability'
import { createServices } from './services'
import { createJobHandlers } from './job-handlers'
const services = createServices()
const { config, database } = services
const mail = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  connectionTimeout: 10_000,
  socketTimeout: 30_000,
  auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined,
})
const handlers = createJobHandlers(services, async (payload, id) => {
  await mail.sendMail({ from: config.MAIL_FROM, ...payload, messageId: `<${id}@voidmix>` })
})

let stopping = false
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    stopping = true
  })
let lastMaintenance = 0
try {
  while (!stopping) {
    try {
      if (Date.now() - lastMaintenance > 60_000) {
        const expired = await database.db
          .select()
          .from(files)
          .where(
            and(
              eq(files.status, 'pending'),
              lt(files.createdAt, new Date(Date.now() - 30 * 60_000)),
            ),
          )
        for (const file of expired)
          await services.files.remove(file.ownerId, file.id, 'upload-cleanup')
        await cleanupRequestLimits(database.db)
        await pruneCompletedJobs(database.db)
        lastMaintenance = Date.now()
      }
      if (!(await runNextJob(database.db, handlers)))
        await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch {
      const logger = createLogger({ requestId: crypto.randomUUID() })
      logger.error('Worker iteration failed')
      logger.emit()
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
} finally {
  mail.close()
  await services.close()
}
