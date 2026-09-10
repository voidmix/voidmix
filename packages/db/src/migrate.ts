import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createDatabase } from './index'
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required. Load the root .env before migrating.')
const database = createDatabase(process.env.DATABASE_URL)
try {
  await migrate(database.db, {
    migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
  })
} finally {
  await database.close()
}
