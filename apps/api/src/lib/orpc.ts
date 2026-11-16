import { implement } from "@orpc/server"
import { contract } from "@voidmix/api/contract"
import { rpcLogger } from "@voidmix/logger/orpc"

import type { RpcContext } from "./context"

export const apiBase = implement(contract).$context<RpcContext>()
// Add operation context to Hono's existing event; do not create a second request logger.
export const api = apiBase.use(rpcLogger<RpcContext>())
