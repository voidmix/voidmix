import type { AuthSession } from "@voidmix/auth/types"
import type { Cache } from "@voidmix/cache/client"
import type { Database } from "@voidmix/db/client"
import type { AuditableLogger } from "@voidmix/logger"
import type { EvlogVariables } from "@voidmix/logger/hono"
import type { ObjectStorage } from "@voidmix/storage/client"

export type ApiEnv = {
  Variables: EvlogVariables["Variables"] & { session: AuthSession | null; requestId: string }
}
export type RpcContext = {
  headers: Headers
  session: AuthSession | null
  log: AuditableLogger
  services: ApiServices
}

/** Borrowed capabilities; the resource owner controls acquisition and shutdown. */
export interface ApiServices {
  readonly database: Database
  getCache(): Promise<Cache | null>
  getStorage(): ObjectStorage | null
}

/** Only the two auth operations the HTTP application needs, rather than the entire auth SDK. */
export interface ApiAuth {
  handler: (request: Request) => Promise<Response>
  api: { getSession: (input: { headers: Headers }) => Promise<AuthSession | null> }
}
