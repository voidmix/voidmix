import { createApiClient } from "@voidmix/api/client"

import { getSessionToken } from "./auth"
import { getApiOrigin } from "./config"

export function getApiClient() {
  return createApiClient(new URL("/api/rpc", getApiOrigin()).href, {
    credentials: "omit",
    headers: async () => {
      const headers = new Headers()
      const token = await getSessionToken()
      if (token) headers.set("Authorization", `Bearer ${token}`)
      return headers
    },
  })
}

export function greet() {
  return getApiClient().greet({ name: "Voidmix" })
}
