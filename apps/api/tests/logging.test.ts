import { afterEach, beforeEach, expect, test } from "bun:test"
import { HTTPException } from "hono/http-exception"
import { configureLogger, log, type EvlogConfig, type WideEvent } from "@voidmix/logger"

import { createApp } from "../src/app"

let events: WideEvent[]
let config: EvlogConfig

beforeEach(() => {
  events = []
  config = configureLogger("voidmix-api-test", {
    env: { NODE_ENV: "test" },
    silent: true,
    drain: ({ event }) => {
      events.push(event)
    },
  })
})

afterEach(() => {
  configureLogger("voidmix-api-test", { env: { NODE_ENV: "test" }, silent: true, drain: () => {} })
})

function app() {
  return createApp({
    logger: config,
    corsOrigins: [],
    auth: {
      handler: async () => new Response(null, { status: 404 }),
      api: { getSession: async () => null },
    },
  })
}

test("LOG_LEVEL 同时过滤普通日志与请求事件", async () => {
  config = configureLogger("filtered", {
    env: { NODE_ENV: "test", LOG_LEVEL: "warn" },
    silent: true,
    drain: ({ event }) => {
      events.push(event)
    },
  })
  log.info({ action: "hidden" })
  const server = app().get("/ok", (c) => c.json({ ok: true }))
  const response = await server.request("/ok")
  expect(response.status).toBe(200)
  expect(events).toHaveLength(0)
  await server.request("/missing")
  expect(events).toHaveLength(1)
  expect(events[0]).toMatchObject({ status: 404, level: "warn" })
})

test("请求 ID 在日志和响应中一致，查询参数、请求体与凭据不进入事件", async () => {
  const server = app().post("/example", (c) => c.json({ ok: true }))
  const response = await server.request("/example?token=private-query", {
    method: "POST",
    headers: {
      "X-Request-Id": "request-example",
      Authorization: "Bearer private-credential",
      Cookie: "session=private-cookie",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: "private-body" }),
  })
  expect(response.headers.get("X-Request-Id")).toBe("request-example")
  expect(events).toHaveLength(1)
  expect(events[0]).toMatchObject({
    method: "POST",
    path: "/example",
    requestId: "request-example",
    status: 200,
  })
  expect(typeof events[0]!.durationMs).toBe("number")
  expect(JSON.stringify(events)).not.toMatch(/private-(query|credential|cookie|body)/)
})

test("无效或过长的请求 ID 被替换，错误响应仍带关联 ID", async () => {
  const server = app().get("/error", () => {
    throw new Error("private implementation detail")
  })
  for (const value of ["invalid id", "a".repeat(129)]) {
    const response = await server.request("/error", { headers: { "X-Request-Id": value } })
    expect(response.status).toBe(500)
    expect(await response.text()).toBe("Internal Server Error")
    const id = response.headers.get("X-Request-Id")
    expect(id).toMatch(/^[a-f0-9-]{36}$/)
    expect(events.at(-1)).toMatchObject({ requestId: id, status: 500, level: "error" })
    expect(events.at(-1)).toHaveProperty("error.message", "private implementation detail")
  }
  const denied = app().get("/denied", () => {
    throw new HTTPException(403, { message: "Denied" })
  })
  const response = await denied.request("/denied")
  expect(response.status).toBe(403)
  expect(await response.text()).toBe("Denied")
})
