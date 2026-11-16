import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"

import type { ApiClient } from "./contract"

/** Transport only: callers own the origin, per-request credentials, and timeout policy. */
export function createApiClient(
  url: string,
  options: {
    headers?: () => Headers | Promise<Headers>
    credentials?: RequestCredentials
    fetch?: (request: Request, init?: RequestInit) => Promise<Response>
  } = {},
): ApiClient {
  return createORPCClient(
    new RPCLink({
      url,
      headers: options.headers,
      fetch: (request, init) =>
        (options.fetch ?? fetch)(request, {
          ...init,
          credentials: options.credentials ?? "include",
        }),
    }),
  )
}
