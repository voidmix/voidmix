import { Hono } from "hono"

import { corsMiddleware } from "./src/middleware/cors"
import { rpcMiddleware } from "./src/middleware/rpc"
import { sessionMiddleware } from "./src/middleware/session"
import { loggerMiddleware } from "./src/middleware/logger"
import { errorHandler } from "./src/middleware/error"
import { authRoutes } from "./src/routes/auth"
import { healthRoutes } from "./src/routes/health"
import type { ApiEnv } from "./src/lib/context"

const app = new Hono<ApiEnv>()

// Logging wraps every response, including CORS preflights, auth errors, and 404s.
app.use("*", ...loggerMiddleware)
app.onError(errorHandler)
app.route("/", healthRoutes)
app.use("/api/*", corsMiddleware)
app.route("/", authRoutes)
// Resolve sessions once per RPC request; authorization remains procedure-specific.
app.use("/api/rpc/*", sessionMiddleware)
app.use("/api/rpc/*", rpcMiddleware)

export default app
