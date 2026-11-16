import { createDatabase } from "@voidmix/db/client"

import { requiredEnv } from "./env"

// The application owns the pool. Importing the shared factory never opens a connection.
const database = createDatabase(requiredEnv("DATABASE_URL"))

export const db = database.db

/** Called by Nitro after request handling stops, rather than after individual requests. */
export function closeDatabase() {
  return database.pool.end()
}
