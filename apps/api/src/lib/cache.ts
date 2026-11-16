import { createCache, type Cache } from "@voidmix/cache/client"

/** Share one lazy connection attempt inside an application-owned resource lifetime. */
export function createCacheResource(url: string | undefined, onError: () => void) {
  let connection: Promise<Cache> | undefined

  return {
    async get(): Promise<Cache | null> {
      if (!url) return null
      if (!connection) {
        const cache = createCache(url)
        cache.on("error", onError)
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
    },
    async close() {
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
    },
  }
}
