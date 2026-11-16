import { migrate } from "drizzle-orm/node-postgres/migrator"
import { fileURLToPath } from "node:url"

import { createDatabase } from "./client"

export async function migrateDatabase(connectionString: string) {
  // Resolve migrations relative to this module so CLI and bundled deployment jobs agree.
  const { db, pool } = createDatabase(connectionString, { max: 1 })
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../drizzle/", import.meta.url)),
    })
  } finally {
    // One-shot jobs must release the pool even when a migration fails.
    await pool.end()
  }
}
