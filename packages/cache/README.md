# @voidmix/cache

Server-side Redis helpers using ioredis 6. The package owns connection defaults and JSON/TTL behavior; applications own configuration, reuse, fallback policy, and shutdown. Browser code accesses cache-backed behavior through the API.

## Local development

```sh
bun run cache:up
```

Redis 8 listens on `127.0.0.1:6379`, with a 128 MB `allkeys-lru` cache and no persistence. `cache:down` stops only Redis. Root `.env` uses `REDIS_URL=redis://127.0.0.1:6379/0`; production should inject an authenticated connection, using `rediss://` for TLS.

## API usage

```ts
import type { Cache } from "@voidmix/cache/client"
import { getJson, setJson } from "@voidmix/cache/json"

async function cacheExample(getCache: () => Promise<Cache | null>) {
  const cache = await getCache()
  if (!cache) return
  await setJson(cache, "example:123", { title: "Voidmix" }, 60)
  const value = await getJson<{ title: string }>(cache, "example:123")
  await cache.del("example:123")
  return value
}
```

Pass `getCache` from the API resource owner into its consumer. It returns `null` without `REDIS_URL` and otherwise shares one lazy connection attempt per resource owner. Failed initialization clears the promise so a later call can retry. The Nitro resource plugin closes it. Cache failures reject; business code decides whether to fail or read the source of truth.

`getJson<T>` returns `null` for a miss and rejects malformed JSON. The type argument does not perform runtime validation. `setJson` requires an explicit positive integer TTL in seconds and a JSON-serializable value.

## Independent consumers

```ts
import { createCache } from "@voidmix/cache/client"

const cache = createCache(redisUrl, { keyPrefix: "voidmix:worker:" })
cache.on("error", () => console.error("Redis connection failed"))
try {
  await cache.connect()
  await cache.set("example", "value", "EX", 60)
} finally {
  try {
    if (cache.status === "ready") await cache.quit()
  } finally {
    cache.disconnect()
  }
}
```

The factory returns a disconnected native ioredis client. Attach an error listener before `connect()`. Defaults: five-second connection/command timeouts, one retry per request, reconnect delay capped at two seconds, offline queue disabled, and `voidmix:` key prefix. Pass ioredis options to override them. Disconnected writes fail immediately rather than being replayed later.

Pipeline, transactions, counters, expiration, and deletion remain available. ioredis does not add `keyPrefix` to `SCAN`/`KEYS` patterns or returned keys; use explicit namespaces for those operations.

## Integration tests

```sh
TEST_REDIS_URL=redis://127.0.0.1:6379/1 bun run test:cache
```

Tests require this explicit variable, use random key prefixes, and clean only their own keys. They never flush a database or fall back to `REDIS_URL`. Coverage includes JSON, overwrite/delete, real expiration, namespace isolation, native commands, invalid writes, and connection failures.
