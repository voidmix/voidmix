import { expect, mock, test } from "bun:test"
import { configureLogger } from "@voidmix/logger"
import type { AuthSession } from "@voidmix/auth/types"

import { createApp } from "../src/app"
import type { ApiAuth } from "../src/lib/context"

const logger = () =>
  configureLogger("voidmix-api-test", { env: { NODE_ENV: "test" }, silent: true, drain: () => {} })

function fixture(session: AuthSession | null = null, origins: string[] = []) {
  const auth = {
    handler: mock(async (_request: Request) => new Response("auth response", { status: 202 })),
    api: { getSession: mock(async (_input: { headers: Headers }) => session) },
  } satisfies ApiAuth
  return { auth, app: createApp({ auth, corsOrigins: origins, logger: logger() }) }
}

const rpc = (input: unknown = undefined, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ json: input }),
})

test("liveness and CORS preflights never invoke authentication", async () => {
  const { app, auth } = fixture(null, ["https://mobile.test"])
  expect(await (await app.request("/health")).json()).toEqual({ status: "ok" })
  const preflight = await app.request("/api/rpc/greet", {
    method: "OPTIONS",
    headers: { Origin: "https://mobile.test", "Access-Control-Request-Method": "POST" },
  })
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("https://mobile.test")
  expect(preflight.headers.get("X-Request-Id")).toBeTruthy()
  expect(auth.handler).not.toHaveBeenCalled()
  expect(auth.api.getSession).not.toHaveBeenCalled()
})

test("auth requests are passed through without RPC session resolution", async () => {
  const { app, auth } = fixture()
  const response = await app.request("/api/auth/sign-in/email", rpc({ email: "test@example.test" }))
  expect(response.status).toBe(202)
  expect(await response.text()).toBe("auth response")
  expect(auth.handler).toHaveBeenCalledTimes(1)
  expect(auth.api.getSession).not.toHaveBeenCalled()
  const request = auth.handler.mock.calls[0]![0]
  // The handler receives the original request, including its streamed body.
  expect(new URL(request.url).pathname).toBe("/api/auth/sign-in/email")
  expect(await request.json()).toEqual({ json: { email: "test@example.test" } })
})

test("public RPC validates input and resolves the current request's credentials once", async () => {
  const { app, auth } = fixture()
  const response = await app.request(
    "/api/rpc/greet",
    rpc({ name: "  Test  " }, { Authorization: "Bearer example" }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ json: { message: "你好，Test！这条消息来自 oRPC。" } })
  expect(auth.api.getSession).toHaveBeenCalledTimes(1)
  expect(auth.api.getSession.mock.calls[0]![0].headers.get("Authorization")).toBe("Bearer example")
  expect((await app.request("/api/rpc/greet", rpc({ name: " " }))).status).toBe(400)
})

test("private RPC still requires an authenticated session", async () => {
  const { app } = fixture()
  const response = await app.request("/api/rpc/me", rpc())
  expect(response.status).toBe(401)
  expect(await response.json()).toMatchObject({ json: { code: "UNAUTHORIZED" } })
})

test("separate application instances keep sessions and allowed origins isolated", async () => {
  const now = new Date()
  const session: AuthSession = {
    user: {
      id: "user-1",
      name: "Test",
      email: "test@example.test",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: "session-1",
      userId: "user-1",
      token: "test-only-token",
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
    },
  }
  const authenticated = fixture(session, ["https://one.test"])
  const anonymous = fixture(null, ["https://two.test"])
  const [signedIn, signedOut] = await Promise.all([
    authenticated.app.request("/api/rpc/me", rpc()),
    anonymous.app.request("/api/rpc/me", rpc()),
  ])
  expect(signedIn.status).toBe(200)
  expect(await signedIn.json()).toEqual({
    json: { id: "user-1", name: "Test", email: "test@example.test", image: null },
  })
  expect(signedOut.status).toBe(401)
  const denied = await anonymous.app.request("/api/rpc/greet", {
    method: "OPTIONS",
    headers: { Origin: "https://one.test", "Access-Control-Request-Method": "POST" },
  })
  expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull()
})

test("session failures remain generic 500 responses with request IDs", async () => {
  const { app, auth } = fixture()
  auth.api.getSession.mockRejectedValueOnce(new Error("private database detail"))
  const response = await app.request("/api/rpc/greet", rpc({ name: "Test" }))
  expect(response.status).toBe(500)
  expect(await response.text()).toBe("Internal Server Error")
  expect(response.headers.get("X-Request-Id")).toBeTruthy()
})
