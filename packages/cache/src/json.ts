import type { Cache } from "./client"

/** A miss is null; malformed JSON rejects. T is a type assertion, not runtime validation. */
export async function getJson<T>(cache: Cache, key: string): Promise<T | null> {
  const value = await cache.get(key)
  return value === null ? null : (JSON.parse(value) as T)
}

/** Require an explicit finite TTL in seconds to prevent accidental permanent cache entries. */
export async function setJson(cache: Cache, key: string, value: unknown, ttlSeconds: number) {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("缓存 TTL 必须是大于 0 的整数秒。")
  }
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new Error("缓存值必须能序列化为 JSON。")
  await cache.set(key, serialized, "EX", ttlSeconds)
}
