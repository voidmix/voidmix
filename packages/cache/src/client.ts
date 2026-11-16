import { Redis, type RedisOptions } from "ioredis"

/** Return a disconnected client; attach an error listener before calling connect(). */
export function createCache(connectionString: string, options: RedisOptions = {}) {
  const url = new URL(connectionString)
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("Redis 地址必须使用 redis:// 或 rediss://。")
  }

  return new Redis(connectionString, {
    lazyConnect: true,
    connectTimeout: 5_000,
    commandTimeout: 5_000,
    maxRetriesPerRequest: 1,
    // Fail disconnected writes immediately rather than replaying stale mutations later.
    enableOfflineQueue: false,
    keyPrefix: "voidmix:",
    retryStrategy: (times) => Math.min(times * 200, 2_000),
    ...options,
  })
}

export type Cache = ReturnType<typeof createCache>
