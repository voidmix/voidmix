import { createAuth } from "@voidmix/auth/server"
import { createDatabase } from "@voidmix/db/client"
import { log } from "@voidmix/logger"

import type { ApiConfig } from "./config"
import { createCacheResource } from "./lib/cache"
import { createStorageResource } from "./lib/storage"

/** The process owns these handles; HTTP adapters only receive the capabilities they use. */
export function createApiResources(config: ApiConfig) {
  const database = createDatabase(config.databaseUrl)
  const auth = createAuth({ database: database.db, ...config.auth })
  const cache = createCacheResource(config.redisUrl, () => {
    log.error({
      action: "cache.connect",
      message: "Redis 缓存连接失败，请检查 REDIS_URL 与 Redis 服务。",
    })
  })
  const storage = createStorageResource(config.storage)
  let closing: Promise<void> | undefined

  function assertOpen() {
    if (closing) throw new Error("API resources are closing.")
  }

  return {
    auth,
    // Guard acquisition like the optional clients; previously borrowed handles are not revoked.
    get database() {
      assertOpen()
      return database.db
    },
    async getCache() {
      assertOpen()
      return cache.get()
    },
    getStorage() {
      assertOpen()
      return storage.get()
    },
    close() {
      // Share one shutdown, forbid new handles, and attempt every disposer even if one throws.
      closing ??= Promise.allSettled(
        [() => database.pool.end(), cache.close, storage.close].map((close) =>
          Promise.resolve().then(close),
        ),
      ).then((results) => {
        const failures = results.flatMap((result) =>
          result.status === "rejected" ? [result.reason] : [],
        )
        if (failures.length) throw new AggregateError(failures, "Failed to close API resources")
      })
      return closing
    },
  }
}
