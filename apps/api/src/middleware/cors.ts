import { cors } from "hono/cors"

import { envList } from "../lib/env"

const defaultOrigins =
  process.env.NODE_ENV === "production" ? [] : ["http://localhost:8081", "http://127.0.0.1:8081"]

const allowedOrigins = envList(process.env.CORS_ORIGINS, defaultOrigins)

export const corsMiddleware = cors({
  origin: allowedOrigins,
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposeHeaders: ["X-Request-Id"],
  credentials: true,
})
