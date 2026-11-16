import { createMiddleware } from "hono/factory"

import type { ApiAuth, ApiEnv } from "../lib/context"

export function createSessionMiddleware(auth: ApiAuth) {
  return createMiddleware<ApiEnv>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    c.set("session", session)
    c.get("log").set({ auth: { authenticated: Boolean(session) } })
    await next()
  })
}
