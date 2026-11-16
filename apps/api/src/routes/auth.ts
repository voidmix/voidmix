import { Hono } from "hono"

import type { ApiAuth } from "../lib/context"

export function createAuthRoutes(auth: ApiAuth) {
  return new Hono().all("/api/auth/*", (c) => auth.handler(c.req.raw))
}
