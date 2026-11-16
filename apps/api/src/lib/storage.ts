import {
  createObjectStorage,
  type ObjectStorage,
  type ObjectStorageOptions,
} from "@voidmix/storage/client"

/** Lazy handles stay local to one resource owner; creating one does not contact S3. */
export function createStorageResource(options: ObjectStorageOptions | undefined) {
  let storage: ObjectStorage | undefined

  return {
    get(): ObjectStorage | null {
      if (!options) return null
      storage ??= createObjectStorage(options)
      return storage
    },
    async close() {
      const current = storage
      storage = undefined
      await current?.dispose()
    },
  }
}
