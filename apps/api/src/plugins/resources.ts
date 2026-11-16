import { definePlugin } from "nitro"

import { closeCache } from "../lib/cache"
import { closeDatabase } from "../lib/database"
import { closeStorage } from "../lib/storage"

export default definePlugin((app) => {
  app.hooks.hook("close", async () => {
    // Attempt every cleanup even when one backend fails; report failures after all settle.
    const results = await Promise.allSettled([closeDatabase(), closeCache(), closeStorage()])
    const failures = results.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    )
    if (failures.length) throw new AggregateError(failures, "Failed to close API resources")
  })
})
