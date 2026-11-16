import { ORPCError } from "@orpc/server"

import { apiBase } from "../lib/orpc"

export const requireSession = apiBase.middleware(({ context, next }) => {
  if (!context.session) {
    throw new ORPCError("UNAUTHORIZED", { message: "请先登录。" })
  }
  return next({ context: { session: context.session } })
})
