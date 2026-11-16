import { api } from "../lib/orpc"
import { requireSession } from "../middleware/require-session"

export const rpcRouter = api.router({
  greet: api.greet.handler(({ input }) => ({
    message: `你好，${input.name}！这条消息来自 oRPC。`,
  })),
  me: api.me.use(requireSession).handler(({ context }) => ({
    id: context.session.user.id,
    name: context.session.user.name,
    email: context.session.user.email,
    image: context.session.user.image ?? null,
  })),
})
