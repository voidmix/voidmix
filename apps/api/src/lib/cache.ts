import { createCache, type Cache } from "@voidmix/cache/client"

import { log } from "./logger"

let connection: Promise<Cache> | undefined

/** Share one connection attempt across callers; absence of REDIS_URL disables caching. */
export async function getCache(): Promise<Cache | null> {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null

  if (!connection) {
    const cache = createCache(url)
    cache.on("error", () => {
      log.error({
        action: "cache.connect",
        message: "Redis 缓存连接失败，请检查 REDIS_URL 与 Redis 服务。",
      })
    })
    connection = cache
      .connect()
      .then(() => cache)
      .catch((error: unknown) => {
        // A rejected promise must not poison future attempts after Redis recovers.
        cache.disconnect()
        connection = undefined
        throw error
      })
  }
  return connection
}

export async function closeCache() {
  const pending = connection
  connection = undefined
  if (!pending) return
  const cache = await pending.catch(() => null)
  if (!cache) return
  try {
    if (cache.status === "ready") await cache.quit()
  } finally {
    cache.disconnect()
  }
}
