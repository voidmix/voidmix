import { definePlugin } from "nitro"

import { logDrain, resources } from "../runtime"

export default definePlugin((app) => {
  app.hooks.hook("close", async () => {
    try {
      await resources.close()
    } finally {
      // Flush last so events emitted while closing resources are exported too.
      await logDrain?.flush()
    }
  })
})
