import { oc } from "@orpc/contract"
import type { ContractRouterClient } from "@orpc/contract"
import { z } from "zod"

export const contract = {
  greet: oc
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .output(z.object({ message: z.string() })),
  me: oc.errors({ UNAUTHORIZED: { message: "请先登录。" } }).output(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.email(),
      image: z.string().nullable(),
    }),
  ),
}

export type ApiClient = ContractRouterClient<typeof contract>
