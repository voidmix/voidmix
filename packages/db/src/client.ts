import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

/** Create a lazy pool. The caller owns pool.end(); size budgets apply to each process. */
export function createDatabase(connectionString: string, options: { max?: number } = {}) {
  const pool = new Pool({
    connectionString,
    max: options.max ?? 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  })
  const db = drizzle(pool, { schema })

  return { db, pool }
}

export type Database = ReturnType<typeof createDatabase>["db"]

/** Round-trip one trivial query; rejects when PostgreSQL is unreachable or the pool is closed. */
export async function pingDatabase(db: Database) {
  await db.execute(sql`select 1`)
}
