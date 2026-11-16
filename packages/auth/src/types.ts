import type { Auth } from "./server"

export type AuthSession = Auth["$Infer"]["Session"]
export type AuthUser = AuthSession["user"]
