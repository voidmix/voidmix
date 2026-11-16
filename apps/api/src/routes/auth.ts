import { Hono } from "hono"

import { auth } from "../lib/auth"

export const authRoutes = new Hono().all("/api/auth/*", (c) => auth.handler(c.req.raw))
