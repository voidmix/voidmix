import { expect, spyOn, test } from "bun:test"

import { loadApiConfig } from "../src/config"
import { createApiResources } from "../src/resources"

// Unreachable endpoints ensure construction and disposal stay lazy, without external test services.
const config = loadApiConfig({
  DATABASE_URL: "postgresql://user:test-only-password@127.0.0.1:1/never_connect",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "resource-test-only-secret-with-at-least-32-characters",
  S3_BUCKET: "resource-test",
  S3_ENDPOINT: "http://127.0.0.1:1",
  S3_REGION: "us-east-1",
  S3_ACCESS_KEY_ID: "test-only-key",
  S3_SECRET_ACCESS_KEY: "test-only-secret",
})

test("construction opens no connections and each owner reuses only its own storage handle", async () => {
  const first = createApiResources(config)
  const second = createApiResources(config)
  try {
    expect(await first.getCache()).toBeNull()
    expect(first.getStorage()).toBe(first.getStorage())
    expect(first.getStorage()).not.toBe(second.getStorage())
  } finally {
    await Promise.all([first.close(), second.close()])
  }
})

test("shutdown is shared and resources cannot be reopened during or after shutdown", async () => {
  const resources = createApiResources({ ...config, storage: undefined })
  const first = resources.close()
  expect(resources.close()).toBe(first)
  expect(() => resources.getStorage()).toThrow("closing")
  await expect(resources.getCache()).rejects.toThrow("closing")
  await first
  await resources.close()
})

test("a failing disposer is reported once and does not cause resources to reopen", async () => {
  const resources = createApiResources(config)
  const handle = resources.getStorage()!
  const failure = new Error("storage disposal failed")
  const dispose = spyOn(handle, "dispose").mockRejectedValue(failure)
  try {
    const closing = resources.close()
    await expect(closing).rejects.toMatchObject({ errors: [failure] })
    await expect(resources.close()).rejects.toBeInstanceOf(AggregateError)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(() => resources.getStorage()).toThrow("closing")
  } finally {
    dispose.mockRestore()
    await handle.dispose()
  }
})
