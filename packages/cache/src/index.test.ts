import { describe, expect, it, vi } from "vite-plus/test";

import { RedisCache, createRedisSecondaryStorage, type RedisClientLike } from "./index.js";

class FakeRedis implements RedisClientLike {
  readonly values = new Map<string, string>();
  readonly expirations = new Map<string, number>();
  ping = vi.fn(async () => "PONG");
  quit = vi.fn(async () => "OK");

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<string | null> {
    const nx = args.includes("NX");
    if (nx && this.values.has(key)) return null;
    this.values.set(key, value);
    const exIndex = args.indexOf("EX");
    if (exIndex >= 0) this.expirations.set(key, Number(args[exIndex + 1]));
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.values.delete(key)) count += 1;
      this.expirations.delete(key);
    }
    return count;
  }

  async mget(...keys: string[]): Promise<Array<string | null>> {
    return keys.map((key) => this.values.get(key) ?? null);
  }

  async incrby(key: string, amount: number): Promise<number> {
    const value = Number(this.values.get(key) ?? "0") + amount;
    this.values.set(key, String(value));
    return value;
  }

  async eval(
    script: string,
    _numberOfKeys: number,
    ...args: Array<string | number>
  ): Promise<unknown> {
    const key = String(args[0]);
    if (script.includes('redis.call("GET", KEYS[1])')) {
      const value = this.values.get(key) ?? null;
      if (value === null) return script.includes("return nil") ? null : false;
      await this.del(key);
      return value;
    }
    const amount = Number(args[1]);
    const ttl = Number(args[2]);
    const existed = this.values.has(key);
    const value = await this.incrby(key, amount);
    if (!existed) this.expirations.set(key, ttl);
    return value;
  }

  async scan(_cursor: string, ...args: string[]): Promise<[string, string[]]> {
    const match = args[args.indexOf("MATCH") + 1] ?? "*";
    const prefix = match.endsWith("*") ? match.slice(0, -1) : match;
    return ["0", [...this.values.keys()].filter((key) => key.startsWith(prefix))];
  }
}

describe("RedisCache", () => {
  it("serializes values and supports Laravel-like get/put operations", async () => {
    const redis = new FakeRedis();
    const cache = new RedisCache(redis, "voidmix:cache");

    await expect(cache.get("missing", "fallback")).resolves.toBe("fallback");
    await expect(cache.put("user", { id: "1" }, 60)).resolves.toBe(true);
    await expect(cache.get<{ id: string }>("user")).resolves.toEqual({ id: "1" });
    expect(redis.expirations.get("voidmix:cache:user")).toBe(60);
  });

  it("restores nested JSON-compatible objects, arrays, and null values", async () => {
    const redis = new FakeRedis();
    const cache = new RedisCache(redis, "voidmix:cache");
    const value = {
      profile: { name: "Ada", roles: ["owner", "admin"] },
      flags: [true, false, null],
      count: 3,
    };

    await cache.put("nested", value);
    await cache.put("null", null);

    await expect(cache.get<typeof value>("nested")).resolves.toEqual(value);
    await expect(cache.get("null")).resolves.toBeNull();
    expect(redis.values.get("voidmix:cache:nested")).toBe(JSON.stringify(value));
    expect(redis.values.get("voidmix:cache:null")).toBe("null");
  });

  it("rejects values that JSON cannot represent", async () => {
    const redis = new FakeRedis();
    const cache = new RedisCache(redis, "voidmix:cache");

    await expect(cache.put("undefined", undefined)).rejects.toThrow("JSON-serializable");
    await expect(cache.put("bigint", BigInt(1))).rejects.toThrow("JSON-serializable");
    const circular: { self?: unknown } = {};
    circular.self = circular;
    await expect(cache.put("circular", circular)).rejects.toThrow("JSON-serializable");
  });

  it("uses NX for add and caches remember results", async () => {
    const redis = new FakeRedis();
    const cache = new RedisCache(redis, "voidmix:cache");
    const resolver = vi.fn(async () => "computed");

    await expect(cache.add("key", "first")).resolves.toBe(true);
    await expect(cache.add("key", "second")).resolves.toBe(false);
    await expect(cache.remember("remember", 30, resolver)).resolves.toBe("computed");
    await expect(cache.remember("remember", 30, resolver)).resolves.toBe("computed");
    expect(resolver).toHaveBeenCalledOnce();
  });

  it("pulls atomically, batches values, counts, and flushes only its prefix", async () => {
    const redis = new FakeRedis();
    const cache = new RedisCache(redis, "voidmix:cache");
    const other = new RedisCache(redis, "other:cache");

    await cache.putMany({ one: 1, two: 2 });
    await other.put("keep", true);
    await expect(cache.getMany<number>(["one", "missing", "two"])).resolves.toEqual({
      one: 1,
      missing: null,
      two: 2,
    });
    await expect(cache.pull<number>("one")).resolves.toBe(1);
    await expect(cache.pull("missing", "fallback")).resolves.toBe("fallback");
    await expect(cache.has("one")).resolves.toBe(false);
    await expect(cache.increment("counter", 2)).resolves.toBe(2);
    await expect(cache.decrement("counter")).resolves.toBe(1);
    await cache.flush();
    await expect(other.get<boolean>("keep")).resolves.toBe(true);
    await expect(cache.missing("two")).resolves.toBe(true);
  });

  it("implements Better Auth raw-string secondary storage semantics", async () => {
    const redis = new FakeRedis();
    const storage = createRedisSecondaryStorage(redis, "voidmix:better-auth");

    await storage.set("token", "raw", 90);
    await expect(storage.get("token")).resolves.toBe("raw");
    await expect(storage.getAndDelete("token")).resolves.toBe("raw");
    await expect(storage.getAndDelete("token")).resolves.toBeNull();
    await expect(storage.get("token")).resolves.toBeNull();
    await expect(storage.increment("rate", 45)).resolves.toBe(1);
    await expect(storage.increment("rate", 45)).resolves.toBe(2);
    expect(redis.expirations.get("voidmix:better-auth:rate")).toBe(45);
  });

  it("propagates Redis failures", async () => {
    const redis = new FakeRedis();
    redis.get = vi.fn(async () => {
      throw new Error("redis unavailable");
    });
    const cache = new RedisCache(redis, "voidmix:cache");

    await expect(cache.get("key")).rejects.toThrow("redis unavailable");
  });

  it("rejects unexpected native RESP3 script replies", async () => {
    const redis = new FakeRedis();
    redis.eval = vi.fn(async () => false);
    const cache = new RedisCache(redis, "voidmix:cache");
    const storage = createRedisSecondaryStorage(redis, "voidmix:better-auth");

    await expect(cache.pull("key")).rejects.toThrow("unexpected string reply shape");
    await expect(storage.getAndDelete("key")).rejects.toThrow("unexpected string reply shape");
    await expect(storage.increment("key", 30)).rejects.toThrow("unexpected number reply shape");
  });
});
