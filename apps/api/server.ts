import { createApp } from "./src/app"
import { config, logger, resources } from "./src/runtime"

export default createApp({
  auth: resources.auth,
  services: resources,
  corsOrigins: config.corsOrigins,
  logger,
})
