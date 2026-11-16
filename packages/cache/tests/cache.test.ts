import { afterEach, expect, test } from "bun:test"
import { createServer } from "node:net"

import { createCache, type Cache } from "../src/client"
import { getJson, setJson } from "../src/json"

const url = process.env.TEST_REDIS_URL
if (!url) throw new Error("请配置 TEST_REDIS_URL，使用独立 Redis 测试服务或逻辑库。")

const clients: Cache[] = []
const keys = ["profile", "expires", "counter", "pending"]

function client(prefix = `voidmix:test:${crypto.randomUUID()}:`) {
  const cache = createCache(url!, { keyPrefix: prefix })
  cache.on("error", () => {})
  clients.push(cache)
  return cache
}

afterEach(async () => {
  const current = clients.splice(0)
  await Promise.all(
    current.map(async (cache) => {
      try {
        if (cache.status === "ready") {
          await cache.del(...keys)
          await cache.quit()
        }
      } finally {
        cache.disconnect()
      }
    }),
  )
})

test("JSON 缓存写入、覆盖、失效后返回未命中", async () => {
  const cache = client()
  expect(cache.status).toBe("wait")
  await cache.connect()
  expect(await getJson(cache, "profile")).toBeNull()

  await setJson(cache, "profile", { name: "Voidmix", roles: ["member"] }, 60)
  expect(await getJson(cache, "profile")).toEqual({ name: "Voidmix", roles: ["member"] })
  await setJson(cache, "profile", { name: "Updated" }, 30)
  expect(await getJson(cache, "profile")).toEqual({ name: "Updated" })
  expect(await cache.ttl("profile")).toBeGreaterThan(0)

  await cache.del("profile")
  expect(await getJson(cache, "profile")).toBeNull()
})

test("Redis 实际过期后不再返回旧值", async () => {
  const cache = client()
  await cache.connect()
  await setJson(cache, "expires", { valid: true }, 1)
  expect(await getJson(cache, "expires")).toEqual({ valid: true })
  await Bun.sleep(1_100)
  expect(await getJson(cache, "expires")).toBeNull()
})

test("命名空间隔离相同 key，原生命令与 JSON 工具共用连接", async () => {
  const first = client()
  const second = client()
  await Promise.all([first.connect(), second.connect()])
  await setJson(first, "profile", { name: "First" }, 60)
  await setJson(second, "profile", { name: "Second" }, 60)
  expect(await getJson(first, "profile")).toEqual({ name: "First" })
  expect(await getJson(second, "profile")).toEqual({ name: "Second" })

  await first.set("counter", 1, "EX", 60)
  expect(await first.incr("counter")).toBe(2)
  expect(await second.get("counter")).toBeNull()
})

test("无效 TTL 或不可序列化值不会写入永久缓存", async () => {
  const cache = client()
  await cache.connect()
  await expect(setJson(cache, "profile", { name: "Voidmix" }, 0)).rejects.toThrow()
  await expect(setJson(cache, "profile", undefined, 60)).rejects.toThrow()
  expect(await cache.exists("profile")).toBe(0)
})

test("服务不可用时连接与命令会失败，断开后不保留后台重试", async () => {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("无法取得测试端口。")
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  const cache = createCache(`redis://127.0.0.1:${address.port}`, {
    connectTimeout: 200,
    commandTimeout: 200,
    retryStrategy: () => null,
  })
  cache.on("error", () => {})
  clients.push(cache)
  await expect(cache.connect()).rejects.toThrow()
  await expect(cache.set("pending", "value", "EX", 60)).rejects.toThrow()
  cache.disconnect()
  expect(cache.status).toBe("end")
})
