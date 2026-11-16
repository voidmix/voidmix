import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { os } from "@orpc/server"
import { RPCHandler } from "@orpc/server/fetch"

import { configureLogger, createLogger, log, type WideEvent, type AuditableLogger } from "../src"
import { useLogger } from "../src/hono"
import { rpcLogger } from "../src/orpc"
import { loggerMiddleware } from "../../../apps/api/src/middleware/logger"
import { errorHandler } from "../../../apps/api/src/middleware/error"
import type { ApiEnv } from "../../../apps/api/src/lib/context"

let events: WideEvent[]

beforeEach(() => {
  events = []
  configureLogger("voidmix-test", {
    env: { NODE_ENV: "test" },
    silent: true,
    drain: ({ event }) => {
      events.push(event)
    },
  })
})

afterEach(() => {
  configureLogger("voidmix-test", { env: { NODE_ENV: "test" }, silent: true, drain: () => {} })
})

function app() {
  const server = new Hono<ApiEnv>()
  server.use("*", ...loggerMiddleware)
  server.onError(errorHandler)
  return server
}

test("生产输出为单行 JSON，并包含服务、环境和业务字段", () => {
  const output = spyOn(console, "info").mockImplementation(() => {})
  try {
    configureLogger("worker", { env: { NODE_ENV: "production" } })
    log.info({ action: "job.completed", count: 3 })
    expect(output).toHaveBeenCalledTimes(1)
    const line = output.mock.calls[0]![0] as string
    expect(line).not.toContain("\n")
    expect(JSON.parse(line)).toMatchObject({
      service: "worker",
      environment: "production",
      level: "info",
      action: "job.completed",
      count: 3,
    })
  } finally {
    output.mockRestore()
  }
})

test("脱敏覆盖嵌套凭据、Cookie、设备授权码及错误中的数据库密码", () => {
  const context = {
    user: { email: "alice@example.test", password: "plain-password" },
    headers: { authorization: "Bearer plain-token", cookie: "session=private-cookie" },
    auth: { device_code: "private-device-code", user_code: "ABCD-EFGH" },
    credentials: { secretAccessKey: "private-s3-secret" },
  }
  const logger = createLogger(context)
  logger.error(new Error("Failed to connect to postgresql://user:private-db-password@db:5432/app"))
  const event = logger.emit()!
  const serialized = JSON.stringify(event)
  for (const value of [
    "alice@example.test",
    "plain-password",
    "plain-token",
    "private-cookie",
    "private-device-code",
    "ABCD-EFGH",
    "private-s3-secret",
    "private-db-password",
  ]) {
    expect(serialized).not.toContain(value)
  }
  expect(event.level).toBe("error")
  expect(context.user.password).toBe("plain-password")
})

test("LOG_LEVEL 同时过滤普通日志与请求事件", async () => {
  configureLogger("filtered", {
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

test("错误的日志配置会在启动时报告变量名称", () => {
  expect(() => configureLogger("invalid", { env: { LOG_FORMAT: "xml" } })).toThrow("LOG_FORMAT")
  expect(() => configureLogger("invalid", { env: { LOG_LEVEL: "verbose" } })).toThrow("LOG_LEVEL")
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

test("并发异步请求的 useLogger 上下文互相隔离", async () => {
  const server = app().get("/:name", async (c) => {
    const name = c.req.param("name")
    await new Promise((resolve) => setTimeout(resolve, name === "slow" ? 10 : 1))
    useLogger().set({ task: name })
    return c.json({ ok: true })
  })
  await Promise.all(
    ["slow", "fast"].map((name) =>
      server.request(`/${name}`, { headers: { "X-Request-Id": `request-${name}` } }),
    ),
  )
  expect(events).toHaveLength(2)
  for (const name of ["slow", "fast"]) {
    expect(events.find((event) => event.requestId === `request-${name}`)).toMatchObject({
      path: `/${name}`,
      task: name,
    })
  }
})

test("oRPC 与 Hono 共用一个事件，过程错误被记录且内部详情不泄露到响应", async () => {
  const base = os.$context<{ log: AuditableLogger }>().use(rpcLogger())
  const handler = new RPCHandler({
    fail: base.handler(() => {
      throw new Error("orpc internal detail")
    }),
    ok: base.handler(({ context }) => {
      context.log.set({ task: "rpc" })
      return { ok: true }
    }),
  })
  const server = app().all("/rpc/*", async (c) => {
    const result = await handler.handle(c.req.raw, {
      prefix: "/rpc",
      context: { log: c.get("log") },
    })
    return result.response ?? c.notFound()
  })
  const response = await server.request("/rpc/fail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"json":null}',
  })
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain("orpc internal detail")
  expect(events).toHaveLength(1)
  expect(events[0]).toMatchObject({ operation: "fail", status: 500, level: "error" })
  expect(events[0]).toHaveProperty("error.message", "orpc internal detail")
  await server.request("/rpc/ok", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"json":null}',
  })
  expect(events).toHaveLength(2)
  expect(events[1]).toMatchObject({ operation: "ok", task: "rpc", status: 200 })
})
