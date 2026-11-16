import { RPCHandler } from "@orpc/server/fetch"
import { createMiddleware } from "hono/factory"

import { rpcRouter } from "../routes/rpc"
import type { ApiEnv, ApiServices, RpcContext } from "../lib/context"

export type RpcRouter = ConstructorParameters<typeof RPCHandler<RpcContext>>[0]

export function createRpcMiddleware(services: ApiServices, router: RpcRouter = rpcRouter) {
  const handler = new RPCHandler(router)

  return createMiddleware<ApiEnv>(async (c, next) => {
    const { response } = await handler.handle(c.req.raw, {
      prefix: "/api/rpc",
      context: {
        headers: c.req.raw.headers,
        session: c.get("session"),
        log: c.get("log"),
        services,
      },
    })

    if (response) {
      return c.newResponse(response.body, response)
    }

    await next()
  })
}
