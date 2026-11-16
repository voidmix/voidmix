import { Hono } from "hono"
import type { EvlogConfig } from "@voidmix/logger"

import { createCorsMiddleware } from "./middleware/cors"
import { rpcMiddleware } from "./middleware/rpc"
import { createSessionMiddleware } from "./middleware/session"
import { createLoggerMiddleware } from "./middleware/logger"
import { errorHandler } from "./middleware/error"
import { createAuthRoutes } from "./routes/auth"
import { healthRoutes } from "./routes/health"
import type { ApiAuth, ApiEnv } from "./lib/context"

interface AppOptions {
  auth: ApiAuth
  corsOrigins: readonly string[]
  logger: EvlogConfig
}

/** Assemble HTTP behavior without reading environment variables or creating backend clients. */
export function createApp(options: AppOptions) {
  const app = new Hono<ApiEnv>()

  // Logging wraps every response, including CORS preflights, auth errors, and 404s.
  app.use("*", ...createLoggerMiddleware(options.logger))
  app.onError(errorHandler)
  app.route("/", healthRoutes)
  app.use("/api/*", createCorsMiddleware(options.corsOrigins))
  app.route("/", createAuthRoutes(options.auth))
  // Resolve sessions once per RPC request; authorization remains procedure-specific.
  app.use("/api/rpc/*", createSessionMiddleware(options.auth))
  app.use("/api/rpc/*", rpcMiddleware)

  return app
}
