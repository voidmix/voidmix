import { definePlugin } from "nitro"

import { resources } from "../runtime"

export default definePlugin((app) => {
  app.hooks.hook("close", () => resources.close())
})
