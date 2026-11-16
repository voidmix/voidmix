import { createFileRoute } from "@tanstack/react-router"

import { proxyApiRequest } from "@/server/api"

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      ANY: ({ request }) => proxyApiRequest(request),
    },
  },
})
