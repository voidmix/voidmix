import { Redis } from "ioredis";

export interface Cache {
  /**
   * Read a JSON value. `T` is a compile-time assertion; JSON.parse does not
   * revive class instances, Date, Map, Set, or other custom prototypes.
   * `defaultValue` is evaluated only on a cache miss.
   */
  get<T>(key: string, defaultValue?: T | (() => T)): Promise<T | null>;
  /** Store a JSON value; TTL is expressed in integer seconds. */
  put<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
  /** Store only when the key does not already exist (Redis `SET ... NX`). */
  add<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
  /** Resolve and store a missing value without locking concurrent resolvers. */
  remember<T>(key: string, ttlSeconds: number, resolver: () => T | Promise<T>): Promise<T>;
  /** Resolve and store a value without an expiry. */
  rememberForever<T>(key: string, resolver: () => T | Promise<T>): Promise<T>;
  forever<T>(key: string, value: T): Promise<boolean>;
  has(key: string): Promise<boolean>;
  missing(key: string): Promise<boolean>;
  /** Read and delete a key atomically. */
  pull<T>(key: string, defaultValue?: T | (() => T)): Promise<T | null>;
  forget(key: string): Promise<boolean>;
  increment(key: string, amount?: number): Promise<number>;
  decrement(key: string, amount?: number): Promise<number>;
  /** Scan and delete only keys under this cache instance's namespace. */
  flush(): Promise<boolean>;
  getMany<T>(keys: readonly string[]): Promise<Record<string, T | null>>;
  putMany<T>(values: Record<string, T>, ttlSeconds?: number): Promise<boolean>;
}

/**
 * Low-level store contract. Stores keep raw strings; the Cache facade owns
 * JSON encoding so different backends share the same value format.
 */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  getAndDelete(key: string): Promise<string | null>;
  getMany(keys: readonly string[]): Promise<Array<string | null>>;
  set(key: string, value: string, ttlSeconds?: number): Promise<boolean>;
  setMany(values: Record<string, string>, ttlSeconds?: number): Promise<boolean>;
  add(key: string, value: string, ttlSeconds?: number): Promise<boolean>;
  increment(key: string, amount: number): Promise<number>;
  decrement(key: string, amount: number): Promise<number>;
  delete(key: string): Promise<boolean>;
  flush(): Promise<boolean>;
}

export interface SecondaryStorage {
  get(key: string): Promise<string | null>;
  getAndDelete(key: string): Promise<string | null>;
  increment(key: string, ttl: number): Promise<number>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RedisClientLike {
  connect?(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  mget(...keys: string[]): Promise<Array<string | null>>;
  incrby(key: string, amount: number): Promise<number>;
  eval(script: string, numberOfKeys: number, ...args: Array<string | number>): Promise<unknown>;
  scan(cursor: string, ...args: string[]): Promise<[string, string[]]>;
  ping(): Promise<string>;
  quit(): Promise<string>;
}

export interface RedisCacheOptions {
  url?: string;
  prefix?: string;
  connectTimeoutMs?: number;
  operationTimeoutMs?: number;
  maxRetriesPerRequest?: number;
  client?: RedisClientLike;
}

export interface RedisCacheConnection {
  cache: Cache;
  secondaryStorage: SecondaryStorage;
  close(): Promise<void>;
}

const GET_AND_DELETE_SCRIPT = `
-- Verification tokens must be consumed exactly once.
local value = redis.call("GET", KEYS[1])
-- Redis Lua represents a missing GET as false. Under native RESP3 mapping,
-- returning that value would become a JavaScript boolean instead of null.
if not value then return nil end
redis.call("DEL", KEYS[1])
return value
`;

const INCREMENT_WITH_TTL_SCRIPT = `
-- Better Auth rate limits use a fixed window: later increments do not renew TTL.
local existed = redis.call("EXISTS", KEYS[1])
local value = redis.call("INCRBY", KEYS[1], ARGV[1])
if existed == 0 then redis.call("EXPIRE", KEYS[1], ARGV[2]) end
return value
`;

function assertTtl(ttlSeconds: number): void {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 0) {
    throw new RangeError("Cache TTL must be a non-negative integer number of seconds.");
  }
}

function assertAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError("Cache increment amounts must be safe integers.");
  }
}

function serialize(value: unknown): string {
  let encoded: string | undefined;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw new TypeError("Cache values must be JSON-serializable.");
  }
  if (encoded === undefined) throw new TypeError("Cache values must be JSON-serializable.");
  return encoded;
}

function deserialize<T>(value: string | null): T | null {
  return value === null ? null : (JSON.parse(value) as T);
}

function nullableStringReply(value: unknown): string | null {
  if (value === null || typeof value === "string") return value;
  throw new TypeError("Redis returned an unexpected string reply shape.");
}

function numberReply(value: unknown): number {
  if (typeof value === "number") return value;
  throw new TypeError("Redis returned an unexpected number reply shape.");
}

function resolveDefault<T>(defaultValue: T | (() => T) | undefined): T | null {
  if (defaultValue === undefined) return null;
  return typeof defaultValue === "function" ? (defaultValue as () => T)() : defaultValue;
}

function keyFor(prefix: string, key: string): string {
  return `${prefix}:${key}`;
}

export class RedisCache implements Cache {
  private readonly fullKey: (key: string) => string;

  constructor(
    private readonly client: RedisClientLike,
    prefix: string,
  ) {
    this.fullKey = (key: string) => keyFor(prefix, key);
  }

  async get<T>(key: string, defaultValue?: T | (() => T)): Promise<T | null> {
    const raw = await this.client.get(this.fullKey(key));
    return raw === null ? resolveDefault(defaultValue) : deserialize<T>(raw);
  }

  async put<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (ttlSeconds !== undefined) {
      assertTtl(ttlSeconds);
      if (ttlSeconds === 0) {
        await this.client.del(this.fullKey(key));
        return true;
      }
    }
    const encoded = serialize(value);
    if (ttlSeconds === undefined) await this.client.set(this.fullKey(key), encoded);
    else await this.client.set(this.fullKey(key), encoded, "EX", ttlSeconds);
    return true;
  }

  async add<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (ttlSeconds !== undefined) {
      assertTtl(ttlSeconds);
      if (ttlSeconds === 0) return false;
    }
    const encoded = serialize(value);
    const result =
      ttlSeconds === undefined
        ? await this.client.set(this.fullKey(key), encoded, "NX")
        : await this.client.set(this.fullKey(key), encoded, "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  async remember<T>(key: string, ttlSeconds: number, resolver: () => T | Promise<T>): Promise<T> {
    // This intentionally mirrors Laravel's remember semantics and does not
    // add a distributed lock or stampede protection.
    assertTtl(ttlSeconds);
    const existing = await this.get<T>(key);
    if (existing !== null) return existing;
    const value = await resolver();
    await this.put(key, value, ttlSeconds);
    return value;
  }

  async rememberForever<T>(key: string, resolver: () => T | Promise<T>): Promise<T> {
    const existing = await this.get<T>(key);
    if (existing !== null) return existing;
    const value = await resolver();
    await this.put(key, value);
    return value;
  }

  forever<T>(key: string, value: T): Promise<boolean> {
    return this.put(key, value);
  }

  async has(key: string): Promise<boolean> {
    return (await this.client.get(this.fullKey(key))) !== null;
  }

  async missing(key: string): Promise<boolean> {
    return (await this.client.get(this.fullKey(key))) === null;
  }

  async pull<T>(key: string, defaultValue?: T | (() => T)): Promise<T | null> {
    const raw = nullableStringReply(
      await this.client.eval(GET_AND_DELETE_SCRIPT, 1, this.fullKey(key)),
    );
    return raw === null ? resolveDefault(defaultValue) : deserialize<T>(raw);
  }

  async forget(key: string): Promise<boolean> {
    return (await this.client.del(this.fullKey(key))) > 0;
  }

  async increment(key: string, amount = 1): Promise<number> {
    assertAmount(amount);
    return this.client.incrby(this.fullKey(key), amount);
  }

  async decrement(key: string, amount = 1): Promise<number> {
    assertAmount(amount);
    return this.client.incrby(this.fullKey(key), -amount);
  }

  async flush(): Promise<boolean> {
    // SCAN avoids blocking Redis and keeps FLUSHDB/FLUSHALL out of the public API.
    let cursor = "0";
    let removed = 0;
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        "MATCH",
        `${this.fullKey("")}*`,
        "COUNT",
        "100",
      );
      cursor = nextCursor;
      if (keys.length > 0) removed += await this.client.del(...keys);
    } while (cursor !== "0");
    return removed >= 0;
  }

  async getMany<T>(keys: readonly string[]): Promise<Record<string, T | null>> {
    if (keys.length === 0) return {};
    const values = await this.client.mget(...keys.map(this.fullKey));
    return Object.fromEntries(
      keys.map((key, index) => [key, deserialize<T>(values[index] ?? null)]),
    );
  }

  async putMany<T>(values: Record<string, T>, ttlSeconds?: number): Promise<boolean> {
    await Promise.all(
      Object.entries(values).map(([key, value]) => this.put(key, value, ttlSeconds)),
    );
    return true;
  }
}

export function createRedisSecondaryStorage(
  client: RedisClientLike,
  prefix = "voidmix:better-auth",
): SecondaryStorage {
  // Better Auth stores already-serialized strings, so this adapter must bypass
  // the generic JSON facade while sharing the same Redis connection.
  const fullKey = (key: string) => keyFor(prefix, key);
  return {
    get: (key) => client.get(fullKey(key)),
    async getAndDelete(key) {
      return nullableStringReply(await client.eval(GET_AND_DELETE_SCRIPT, 1, fullKey(key)));
    },
    async increment(key, ttl) {
      assertTtl(ttl);
      const result = await client.eval(INCREMENT_WITH_TTL_SCRIPT, 1, fullKey(key), 1, ttl);
      return numberReply(result);
    },
    async set(key, value, ttl) {
      if (ttl !== undefined) {
        assertTtl(ttl);
        if (ttl === 0) {
          await client.del(fullKey(key));
          return;
        }
        await client.set(fullKey(key), value, "EX", ttl);
        return;
      }
      await client.set(fullKey(key), value);
    },
    async delete(key) {
      await client.del(fullKey(key));
    },
  };
}

export async function createRedisCache(options: RedisCacheOptions): Promise<RedisCacheConnection> {
  if (!options.client && !options.url) throw new Error("Redis URL is required.");
  const ownsClient = !options.client;
  const client =
    options.client ??
    (new Redis<"resp3">(options.url!, {
      protocol: 3,
      replyMapping: "resp3",
      connectTimeout: options.connectTimeoutMs ?? 10_000,
      commandTimeout: options.operationTimeoutMs ?? 5_000,
      maxRetriesPerRequest: options.maxRetriesPerRequest ?? 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    }) as unknown as RedisClientLike);
  try {
    // lazyConnect lets factory creation fail deterministically at this point,
    // before the API starts accepting requests.
    if (ownsClient) await client.connect?.();
    await client.ping();
  } catch (error) {
    if (ownsClient) await client.quit().catch(() => undefined);
    throw error;
  }

  const prefix = options.prefix?.trim() || "voidmix";
  return {
    cache: new RedisCache(client, `${prefix}:cache`),
    secondaryStorage: createRedisSecondaryStorage(client, `${prefix}:better-auth`),
    async close() {
      if (ownsClient) await client.quit();
    },
  };
}

export type { RedisOptions } from "ioredis";
