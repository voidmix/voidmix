import { expect, mock, test } from "bun:test"
import type { Cache } from "@voidmix/cache/client"
import type { Database } from "@voidmix/db/client"
import { configureLogger } from "@voidmix/logger"

import { createApp } from "../src/app"
import type { ApiServices } from "../src/lib/context"
import { fakeServices } from "./fixtures"

// Only the query round trip matters to readiness; no PostgreSQL or Redis is contacted.
const database = (execute: () => Promise<unknown>) => ({ execute }) as unknown as Database
const cache = (ping: () => Promise<unknown>) => ({ ping }) as unknown as Cache

const healthy = (overrides: Partial<ApiServices> = {}): ApiServices => ({
  ...fakeServices(),
  database: database(async () => ({ rows: [] })),
  getCache: async () => null,
  ...overrides,
})

// Takes the complete object: spreading here would evaluate a throwing `database` getter early.
function fixture(services: ApiServices = healthy()) {
  const auth = {
    handler: mock(async () => new Response(null, { status: 404 })),
    api: { getSession: mock(async () => null) },
  }
  const logger = configureLogger("voidmix-api-test", {
    env: { NODE_ENV: "test" },
    silent: true,
    drain: () => {},
  })
  return { auth, app: createApp({ auth, services, corsOrigins: [], logger }) }
}

test("readiness reports a reachable database and a disabled cache without authentication", async () => {
  const { app, auth } = fixture()
  const response = await app.request("/ready")
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    status: "ready",
    checks: { database: "ok", cache: "disabled" },
  })
  expect(auth.api.getSession).not.toHaveBeenCalled()
})

test("an unreachable database fails readiness without exposing the cause", async () => {
  const { app } = fixture(
    healthy({
      database: database(async () => {
        throw new Error("private connection detail")
      }),
    }),
  )
  const response = await app.request("/ready")
  expect(response.status).toBe(503)
  const body = await response.text()
  expect(JSON.parse(body)).toEqual({
    status: "unavailable",
    checks: { database: "unavailable", cache: "disabled" },
  })
  expect(body).not.toContain("private")
  // Liveness is independent, so an outage never restarts the process.
  expect((await app.request("/health")).status).toBe(200)
})

test("the optional cache is reported but never gates traffic", async () => {
  const reachable = fixture(healthy({ getCache: async () => cache(async () => "PONG") }))
  expect(await (await reachable.app.request("/ready")).json()).toMatchObject({
    status: "ready",
    checks: { cache: "ok" },
  })
  const failing = fixture(
    healthy({
      getCache: async () =>
        cache(async () => {
          throw new Error("redis down")
        }),
    }),
  )
  const response = await failing.app.request("/ready")
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    status: "ready",
    checks: { database: "ok", cache: "unavailable" },
  })
})

test("a draining resource owner is taken out of rotation", async () => {
  const closing: ApiServices = {
    get database(): Database {
      throw new Error("API resources are closing.")
    },
    getCache: async () => {
      throw new Error("API resources are closing.")
    },
    getStorage: () => null,
  }
  const { app } = fixture(closing)
  const response = await app.request("/ready")
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({
    status: "unavailable",
    checks: { database: "unavailable", cache: "unavailable" },
  })
})
