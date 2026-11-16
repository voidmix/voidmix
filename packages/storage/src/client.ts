import * as aws4fetch from "aws4fetch"
import { createStorage, hasDotSegment, joinKeys, normalizeKey, prefixStorage } from "unstorage"
import s3Driver, { type S3DriverOptions } from "unstorage/drivers/s3"

export interface ObjectStorageOptions extends Omit<S3DriverOptions, "lib"> {
  prefix?: string
}

/** Return a lazy S3 handle scoped to a non-empty prefix; the caller owns dispose(). */
export function createObjectStorage(options: ObjectStorageOptions) {
  for (const key of ["endpoint", "bucket", "region", "accessKeyId", "secretAccessKey"] as const) {
    if (!options[key]?.trim()) throw new Error(`请配置 S3 ${key}。`)
  }
  const endpoint = new URL(options.endpoint)
  if (
    !["http:", "https:"].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error("S3 endpoint 必须是 HTTP(S) 服务地址。")
  }
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(options.bucket)) {
    throw new Error("S3 bucket 名称无效。")
  }
  const prefix = options.prefix ?? "voidmix"
  if (
    !prefix ||
    prefix.includes("?") ||
    prefix.split(/[:/\\]/).some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("S3 prefix 必须是非空目录路径。")
  }

  const driver = s3Driver({
    endpoint: endpoint.href.replace(/\/$/, ""),
    bucket: options.bucket,
    region: options.region,
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    bulkDelete: options.bulkDelete,
    lib: aws4fetch,
  })
  const storage = createStorage({
    driver,
  })
  const scoped = prefixStorage(storage, prefix)
  // Prefixes scope keys, listing, and deletion together; never expose the unscoped handle.
  // unstorage 2.0.0-beta.0 skips parent mounts in clear(base); call S3 with the scoped base.
  scoped.clear = async (base = "", options = {}) => {
    const normalizedBase = normalizeKey(base)
    if (hasDotSegment(normalizedBase)) throw new Error("S3 clear 目录不能包含路径穿越。")
    await driver.clear!(joinKeys(prefix, normalizedBase), options)
  }
  return scoped
}

export type ObjectStorage = ReturnType<typeof createObjectStorage>
