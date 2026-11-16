import { createAuthClient as createBetterAuthClient } from "better-auth/react"
import { deviceAuthorizationClient } from "better-auth/client/plugins"

export function createAuthClient(baseURL?: string) {
  return createBetterAuthClient({
    baseURL,
    basePath: "/api/auth",
    fetchOptions: { credentials: "include" },
    plugins: [deviceAuthorizationClient()],
  })
}
