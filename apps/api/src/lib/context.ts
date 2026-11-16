import type { AuthSession } from "@voidmix/auth/types"
import type { AuditableLogger } from "@voidmix/logger"
import type { EvlogVariables } from "@voidmix/logger/hono"

export type ApiEnv = {
  Variables: EvlogVariables["Variables"] & { session: AuthSession | null; requestId: string }
}
export type RpcContext = { headers: Headers; session: AuthSession | null; log: AuditableLogger }

/** Only the two auth operations the HTTP application needs, rather than the entire auth SDK. */
export interface ApiAuth {
  handler: (request: Request) => Promise<Response>
  api: { getSession: (input: { headers: Headers }) => Promise<AuthSession | null> }
}
