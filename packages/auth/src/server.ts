import { betterAuth } from "better-auth/minimal"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { bearer } from "better-auth/plugins/bearer"
import { deviceAuthorization } from "better-auth/plugins/device-authorization"
import type { Database } from "@voidmix/db/client"
import * as schema from "@voidmix/db/schema"

interface AuthOptions {
  database: Database
  baseURL: string
  secret: string
  trustedOrigins?: string[]
}

/** Build server auth with an application-owned database; import this subpath only on the server. */
export function createAuth(options: AuthOptions) {
  if (options.secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET 必须至少包含 32 个字符。")
  }

  return betterAuth({
    appName: "Voidmix",
    baseURL: options.baseURL,
    basePath: "/api/auth",
    secret: options.secret,
    database: drizzleAdapter(options.database, { provider: "pg", schema, transaction: true }),
    trustedOrigins: options.trustedOrigins ?? [],
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    advanced: { disableOriginCheck: false },
    plugins: [
      // Native device sessions are independent of the authorization page's cookie session.
      bearer(),
      deviceAuthorization({
        verificationUri: new URL("/authorize", options.baseURL).href,
        expiresIn: "10m",
        interval: "5s",
        validateClient: (id) =>
          ["voidmix-mobile", "voidmix-mobile-web", "voidmix-desktop"].includes(id),
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
