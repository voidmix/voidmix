import { afterEach, expect, test } from "bun:test"
import { AwsClient } from "aws4fetch"

import { createObjectStorage, type ObjectStorage } from "../src/client"

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`请配置独立测试服务的 ${name}。`)
  return value
}

const options = {
  endpoint: required("TEST_S3_ENDPOINT"),
  bucket: required("TEST_S3_BUCKET"),
  region: required("TEST_S3_REGION"),
  accessKeyId: required("TEST_S3_ACCESS_KEY_ID"),
  secretAccessKey: required("TEST_S3_SECRET_ACCESS_KEY"),
}
const stores: ObjectStorage[] = []
const rootPrefix = `tests/${crypto.randomUUID()}`
let sequence = 0

function storage(prefix = `${rootPrefix}/case-${sequence++}`, bulkDelete = true) {
  const store = createObjectStorage({ ...options, prefix, bulkDelete })
  stores.push(store)
  return store
}

afterEach(async () => {
  const current = stores.splice(0)
  await Promise.all(
    current.map(async (store) => {
      try {
        await store.clear()
      } finally {
        await store.dispose()
      }
    }),
  )
})

test("JSON 读写、覆盖与删除，未命中返回 null", async () => {
  const store = storage()
  expect(await store.hasItem("profile")).toBe(false)
  expect(await store.getItem("profile")).toBeNull()
  await store.setItem("profile", { name: "Voidmix", active: true })
  expect(await store.hasItem("profile")).toBe(true)
  expect(await store.getItem("profile")).toEqual({ name: "Voidmix", active: true })
  await store.setItem("profile", { name: "Updated" })
  expect(await store.getItem("profile")).toEqual({ name: "Updated" })
  await store.removeItem("profile")
  expect(await store.getItem("profile")).toBeNull()
})

test("二进制上传下载、Content-Type 与自定义元数据", async () => {
  const prefix = `${rootPrefix}/binary`
  const store = storage(prefix)
  const key = "files/头像 & 1.bin"
  const bytes = new Uint8Array([0, 1, 127, 128, 255])
  await store.setItemRaw(key, bytes, {
    headers: { "Content-Type": "application/octet-stream", "x-amz-meta-owner": "voidmix" },
  })
  const raw = await store.getItemRaw<ArrayBuffer>(key)
  expect(new Uint8Array(raw!)).toEqual(bytes)
  expect(await store.getItem(key, { type: "bytes" })).toEqual(bytes)
  expect(await store.getMeta(key)).toMatchObject({ owner: "voidmix" })
  expect(await store.getKeys("files")).toContain("files:头像 & 1.bin")

  const client = new AwsClient({ ...options, service: "s3" })
  const path = [options.bucket, ...prefix.split("/"), ...key.split("/")]
    .map(encodeURIComponent)
    .join("/")
  const response = await client.fetch(`${options.endpoint.replace(/\/$/, "")}/${path}`, {
    method: "HEAD",
  })
  expect(response.headers.get("Content-Type")).toBe("application/octet-stream")
})

test("目录查询与 clear 仅影响当前前缀，不匹配相邻名称", async () => {
  const first = storage(`${rootPrefix}/a`)
  const sibling = storage(`${rootPrefix}/ab`)
  await first.setItem("docs/one", { owner: "first" })
  await first.setItem("docs-two/two", { owner: "first" })
  await sibling.setItem("docs/one", { owner: "sibling" })
  expect(await first.getKeys("docs")).toEqual(["docs:one"])
  expect((await first.getKeys()).sort()).toEqual(["docs-two:two", "docs:one"].sort())
  await first.clear("docs")
  expect(await first.getItem("docs/one")).toBeNull()
  expect(await first.getItem("docs-two/two")).toEqual({ owner: "first" })
  await first.clear()
  expect(await first.getKeys()).toEqual([])
  expect(await sibling.getItem("docs/one")).toEqual({ owner: "sibling" })
})

test("S3 分页列出超过 1000 个对象，批量清理保持目录隔离", async () => {
  const store = storage()
  const count = 1_005
  for (let offset = 0; offset < count; offset += 25) {
    await Promise.all(
      Array.from({ length: Math.min(25, count - offset) }, (_, index) =>
        store.setItem(`page/${offset + index}`, { index: offset + index }),
      ),
    )
  }
  expect(await store.getKeys("page")).toHaveLength(count)
  await store.clear("page")
  expect(await store.getKeys("page")).toHaveLength(0)
}, 30_000)

test("不支持批量删除的兼容服务可以逐个删除", async () => {
  const store = storage(undefined, false)
  await store.setItem("one", "one")
  await store.setItem("two", "two")
  await store.clear()
  expect(await store.getKeys()).toEqual([])
})

test("拒绝路径穿越，错误的 S3 凭据不会降级写入内存", async () => {
  const store = storage()
  await expect(store.setItem("../escape", "value")).rejects.toThrow()
  await expect(store.clear("../escape")).rejects.toThrow()
  const unauthorized = createObjectStorage({
    ...options,
    secretAccessKey: "invalid-credential",
    prefix: `${rootPrefix}/unauthorized`,
  })
  try {
    await expect(unauthorized.setItem("object", "value")).rejects.toThrow()
  } finally {
    await unauthorized.dispose()
  }
})
