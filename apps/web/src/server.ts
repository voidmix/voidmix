import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { createHttpApp } from '../server/hono'
import { getServices } from '../server/services'
const start = createStartHandler(defaultStreamHandler)
const app = createHttpApp(getServices(), (request, nonce) => start(request, { context: { nonce } }))
export default {
  fetch(request: Request) {
    // Nitro's lazy NodeRequest is not a native Request. Hono reconstructs requests
    // after limiting streamed bodies, so normalize once at the runtime boundary.
    const init: RequestInit & { duplex: 'half' } = {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: request.signal,
      duplex: 'half',
    }
    return app.fetch(new Request(request.url, init))
  },
}
