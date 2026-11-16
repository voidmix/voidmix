import { Hono } from "hono"
import type { EvlogConfig } from "@voidmix/logger"

import { createCorsMiddleware } from "./middleware/cors"
import { createRpcMiddleware, type RpcRouter } from "./middleware/rpc"
import { createSessionMiddleware } from "./middleware/session"
import { createLoggerMiddleware } from "./middleware/logger"
import { errorHandler } from "./middleware/error"
import { createAuthRoutes } from "./routes/auth"
import { createHealthRoutes } from "./routes/health"
import type { ApiAuth, ApiEnv, ApiServices } from "./lib/context"

interface AppOptions {
  auth: ApiAuth
  services: ApiServices
  corsOrigins: readonly string[]
  logger: EvlogConfig
  rpcRouter?: RpcRouter
}

/** Assemble HTTP behavior without reading environment variables or creating backend clients. */
export function createApp(options: AppOptions) {
  const app = new Hono<ApiEnv>()

  // Logging wraps every response, including CORS preflights, auth errors, and 404s.
  app.use("*", ...createLoggerMiddleware(options.logger))
  app.onError(errorHandler)
  app.route("/", createHealthRoutes(options.services))
  app.use("/api/*", createCorsMiddleware(options.corsOrigins))
  app.route("/", createAuthRoutes(options.auth))
  // Resolve sessions once per RPC request; authorization remains procedure-specific.
  app.use("/api/rpc/*", createSessionMiddleware(options.auth))
  app.use("/api/rpc/*", createRpcMiddleware(options.services, options.rpcRouter))

  return app
}
