import { mock } from "bun:test"
import type { Cache } from "@voidmix/cache/client"
import type { Database } from "@voidmix/db/client"
import type { ObjectStorage } from "@voidmix/storage/client"

import type { ApiServices } from "../src/lib/context"

export function fakeServices() {
  // Identity-only stand-ins make context wiring observable without constructing backend clients.
  const database = {} as Database
  const cache = {} as Cache
  const storage = {} as ObjectStorage
  const services = {
    database,
    getCache: mock(async () => cache),
    getStorage: mock(() => storage),
  } satisfies ApiServices
  // Expose the handles so tests compare identities instead of reading untyped mock results.
  return Object.assign(services, { cache, storage })
}
