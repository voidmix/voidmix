import { createMiddleware } from "hono/factory"

import { auth } from "../lib/auth"
import type { ApiEnv } from "../lib/context"

export const sessionMiddleware = createMiddleware<ApiEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set("session", session)
  c.get("log").set({ auth: { authenticated: Boolean(session) } })
  await next()
})
