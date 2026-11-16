import { expect, mock, test } from "bun:test"
import { os } from "@orpc/server"
import { configureLogger } from "@voidmix/logger"
import type { AuthSession } from "@voidmix/auth/types"

import { createApp } from "../src/app"
import type { ApiAuth, RpcContext } from "../src/lib/context"
import type { RpcRouter } from "../src/middleware/rpc"
import { fakeServices } from "./fixtures"

const logger = () =>
  configureLogger("voidmix-api-test", { env: { NODE_ENV: "test" }, silent: true, drain: () => {} })

function fixture(
  session: AuthSession | null = null,
  origins: string[] = [],
  rpcRouter?: RpcRouter,
) {
  const auth = {
    handler: mock(async (_request: Request) => new Response("auth response", { status: 202 })),
    api: { getSession: mock(async (_input: { headers: Headers }) => session) },
  } satisfies ApiAuth
  const services = fakeServices()
  return {
    auth,
    services,
    app: createApp({ auth, services, corsOrigins: origins, logger: logger(), rpcRouter }),
  }
}

const rpc = (input: unknown = undefined, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ json: input }),
})

test("injected backend capabilities reach procedure context", async () => {
  const inspect = mock(async ({ context }: { context: RpcContext }) => ({
    database: context.services.database,
    cache: await context.services.getCache(),
    storage: context.services.getStorage(),
  }))
  const { app, services } = fixture(null, [], {
    inspect: os.$context<RpcContext>().handler(inspect),
  })
  const response = await app.request("/api/rpc/inspect", rpc())
  expect(response.status).toBe(200)
  expect(inspect).toHaveBeenCalledTimes(1)
  expect(inspect.mock.calls[0]![0].context.services).toBe(services)
  // bun:test types settled mock results as unknown; the handler's own return type is the contract.
  const result = (await inspect.mock.results[0]!.value) as Awaited<ReturnType<typeof inspect>>
  expect(result.database).toBe(services.database)
  expect(result.cache).toBe(services.cache)
  expect(result.storage).toBe(services.storage)
  expect(services.getCache).toHaveBeenCalledTimes(1)
  expect(services.getStorage).toHaveBeenCalledTimes(1)
})

test("separate application instances keep backend capabilities isolated", async () => {
  const contexts: RpcContext[] = []
  const router = {
    inspect: os.$context<RpcContext>().handler(async ({ context }) => {
      contexts.push(context)
      await context.services.getCache()
      context.services.getStorage()
      return {}
    }),
  }
  const first = fixture(null, [], router)
  const second = fixture(null, [], router)
  const responses = await Promise.all([
    first.app.request("/api/rpc/inspect", rpc()),
    second.app.request("/api/rpc/inspect", rpc()),
    first.app.request("/api/rpc/inspect", rpc()),
  ])
  expect(responses.map((response) => response.status)).toEqual([200, 200, 200])
  expect(contexts.filter((context) => context.services === first.services)).toHaveLength(2)
  expect(contexts.filter((context) => context.services === second.services)).toHaveLength(1)
  expect(first.services.database).not.toBe(second.services.database)
  expect(first.services.getCache).toHaveBeenCalledTimes(2)
  expect(second.services.getCache).toHaveBeenCalledTimes(1)
  expect(first.services.getStorage).toHaveBeenCalledTimes(2)
  expect(second.services.getStorage).toHaveBeenCalledTimes(1)
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
