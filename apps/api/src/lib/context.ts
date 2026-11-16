import type { AuthSession } from "@voidmix/auth/types"
import type { AuditableLogger } from "@voidmix/logger"
import type { EvlogVariables } from "@voidmix/logger/hono"

export type ApiEnv = {
  Variables: EvlogVariables["Variables"] & { session: AuthSession | null; requestId: string }
}
export type RpcContext = { headers: Headers; session: AuthSession | null; log: AuditableLogger }
