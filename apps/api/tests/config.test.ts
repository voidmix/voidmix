import { expect, test } from "bun:test"

import { loadApiConfig } from "../src/config"

const base = {
  DATABASE_URL: "postgresql://user:config-only-password@127.0.0.1:1/config_test",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "config-only-secret-with-at-least-32-characters",
}

test("required settings report only variable names, without exposing secrets", () => {
  for (const name of Object.keys(base)) {
    expect(() => loadApiConfig({ ...base, [name]: "  " })).toThrow(name)
  }
})

test("CORS defaults distinguish absent, explicitly empty, and configured values", () => {
  expect(loadApiConfig(base).corsOrigins).toEqual([
    "http://localhost:8081",
    "http://127.0.0.1:8081",
  ])
  expect(loadApiConfig({ ...base, NODE_ENV: "production" }).corsOrigins).toEqual([])
  expect(loadApiConfig({ ...base, CORS_ORIGINS: " " }).corsOrigins).toEqual([])
  expect(
    loadApiConfig({ ...base, CORS_ORIGINS: " https://one.test, ,https://two.test " }).corsOrigins,
  ).toEqual(["https://one.test", "https://two.test"])
})

test("auth development origins and custom origins remain independent from CORS", () => {
  const config = loadApiConfig({
    ...base,
    NODE_ENV: "development",
    AUTH_TRUSTED_ORIGINS: " https://login.test ",
  })
  expect(config.auth.trustedOrigins).toContain("http://localhost:3000")
  expect(config.auth.trustedOrigins).toContain("https://login.test")
  expect(config.corsOrigins).not.toContain("https://login.test")
  expect(loadApiConfig({ ...base, NODE_ENV: "production" }).auth.trustedOrigins).toEqual([])
})

test("configuration is a snapshot, independent of later environment mutation", () => {
  const env = { ...base, REDIS_URL: " redis://127.0.0.1:6379 ", CORS_ORIGINS: "https://first.test" }
  const config = loadApiConfig(env)
  env.REDIS_URL = "redis://other.test:6379"
  env.CORS_ORIGINS = "https://other.test"
  expect(config.redisUrl).toBe("redis://127.0.0.1:6379")
  expect(config.corsOrigins).toEqual(["https://first.test"])
})

test("disabled optional backends require no credentials; enabled S3 requires complete configuration", () => {
  expect(loadApiConfig({ ...base, REDIS_URL: " ", S3_BUCKET: " " })).toMatchObject({
    redisUrl: undefined,
    storage: undefined,
  })
  expect(() => loadApiConfig({ ...base, S3_BUCKET: "test-bucket" })).toThrow("S3_ENDPOINT")
  const config = loadApiConfig({
    ...base,
    S3_BUCKET: "test-bucket",
    S3_ENDPOINT: "http://127.0.0.1:1",
    S3_REGION: "us-east-1",
    S3_ACCESS_KEY_ID: "test-key",
    S3_SECRET_ACCESS_KEY: "test-secret",
  })
  expect(config.storage?.prefix).toBe("voidmix")
})
