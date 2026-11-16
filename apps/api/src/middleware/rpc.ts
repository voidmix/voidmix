import { RPCHandler } from "@orpc/server/fetch"
import { createMiddleware } from "hono/factory"

import { rpcRouter } from "../routes/rpc"
import type { ApiEnv } from "../lib/context"

const handler = new RPCHandler(rpcRouter)

export const rpcMiddleware = createMiddleware<ApiEnv>(async (c, next) => {
  const { response } = await handler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context: { headers: c.req.raw.headers, session: c.get("session"), log: c.get("log") },
  })

  if (response) {
    return c.newResponse(response.body, response)
  }

  await next()
})
