import { createObjectStorage, type ObjectStorage } from "@voidmix/storage/client"

import { requiredEnv } from "./env"

let storage: ObjectStorage | undefined

/** Disabled without a bucket; creating the process-local handle does not contact S3. */
export function getStorage(): ObjectStorage | null {
  if (!process.env.S3_BUCKET?.trim()) return null
  storage ??= createObjectStorage({
    endpoint: requiredEnv("S3_ENDPOINT"),
    bucket: requiredEnv("S3_BUCKET"),
    region: requiredEnv("S3_REGION"),
    accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    prefix: process.env.S3_PREFIX?.trim() || "voidmix",
  })
  return storage
}

export async function closeStorage() {
  const current = storage
  storage = undefined
  await current?.dispose()
}
