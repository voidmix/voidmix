import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { fileURLToPath } from "node:url"

import { createDatabase } from "./client"

// Arbitrary constant shared by every migrator of this schema; changing it splits the mutex.
const migrationLockKey = 4_951_337_021

export async function migrateDatabase(connectionString: string) {
  const { pool } = createDatabase(connectionString, { max: 1 })
  try {
    // Session-level advisory locks belong to one connection, so hold a dedicated client for
    // the whole run. Replicas that start together wait here and then find nothing to apply.
    const client = await pool.connect()
    try {
      await client.query("select pg_advisory_lock($1)", [migrationLockKey])
      // Resolve migrations relative to this module so CLI and bundled deployment jobs agree.
      await migrate(drizzle(client), {
        migrationsFolder: fileURLToPath(new URL("../drizzle/", import.meta.url)),
      })
    } finally {
      // Closing the connection also releases the lock if this explicit unlock cannot run.
      await client.query("select pg_advisory_unlock($1)", [migrationLockKey]).catch(() => {})
      client.release()
    }
  } finally {
    // One-shot jobs must release the pool even when a migration fails.
    await pool.end()
  }
}
