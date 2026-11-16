import { createApiClient } from "@voidmix/api/client"

import type { CommandOptions } from "../lib/config"

export async function greet(name: string, options: CommandOptions) {
  const api = createApiClient(`${options.apiUrl}/api/rpc`, {
    credentials: "omit",
    fetch: (request, init) =>
      fetch(request, {
        ...init,
        signal: AbortSignal.timeout(options.timeout),
        redirect: "error",
      }),
  })
  return api.greet({ name })
}
