import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { Hono } from "hono"
import { os } from "@orpc/server"
import { RPCHandler } from "@orpc/server/fetch"

import {
  configureLogger,
  createLogger,
  log,
  toMiddlewareOptions,
  type WideEvent,
  type AuditableLogger,
  type EvlogConfig,
} from "../src"
import { useLogger, evlog, type EvlogVariables } from "../src/hono"
import { rpcLogger } from "../src/orpc"

let events: WideEvent[]
let config: EvlogConfig

beforeEach(() => {
  events = []
  config = configureLogger("voidmix-test", {
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
  const server = new Hono<EvlogVariables>()
  server.use("*", evlog(toMiddlewareOptions(config)))
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

test("错误的日志配置会在启动时报告变量名称", () => {
  expect(() => configureLogger("invalid", { env: { LOG_FORMAT: "xml" } })).toThrow("LOG_FORMAT")
  expect(() => configureLogger("invalid", { env: { LOG_LEVEL: "verbose" } })).toThrow("LOG_LEVEL")
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
    expect(events.find((event) => event.path === `/${name}`)).toMatchObject({
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
