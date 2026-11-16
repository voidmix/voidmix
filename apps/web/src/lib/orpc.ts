import { createIsomorphicFn } from "@tanstack/react-start"
import { createApiClient } from "@voidmix/api/client"
import type { ApiClient } from "@voidmix/api/contract"

import { getApiHeaders, getApiUrl } from "@/server/api"

const getClient = createIsomorphicFn()
  .server(() =>
    createApiClient(getApiUrl("/api/rpc"), {
      // Pass the getter, not a snapshot captured while the process initializes.
      headers: getApiHeaders,
    }),
  )
  .client((): ApiClient => createApiClient(new URL("/api/rpc", window.location.origin).href))

export const orpc: ApiClient = getClient()
