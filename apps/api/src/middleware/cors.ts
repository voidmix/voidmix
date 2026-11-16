import { cors } from "hono/cors"

export function createCorsMiddleware(origins: readonly string[]) {
  return cors({
    origin: [...origins],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id"],
    credentials: true,
  })
}
