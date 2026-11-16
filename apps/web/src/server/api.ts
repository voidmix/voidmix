import "@tanstack/react-start/server-only"

import { getRequestHeaders } from "@tanstack/react-start/server"

export function getApiUrl(path: string) {
  return new URL(path, process.env.API_ORIGIN || "http://127.0.0.1:3002").href
}

export function proxyApiRequest(request: Request) {
  const url = new URL(request.url)
  const upstream = new Request(getApiUrl(`${url.pathname}${url.search}`), request)
  upstream.headers.delete("host")
  // Return redirects and Set-Cookie to the browser unchanged; never follow auth redirects here.
  return fetch(upstream, { redirect: "manual" })
}

/** Read credentials per SSR request, so the shared HTTP client cannot retain another user. */
export function getApiHeaders() {
  const incoming = getRequestHeaders()
  const headers = new Headers()

  for (const name of ["cookie", "authorization"]) {
    const value = incoming.get(name)
    if (value) {
      headers.set(name, value)
    }
  }

  return headers
}
