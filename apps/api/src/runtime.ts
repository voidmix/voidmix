import { configureLogger } from "@voidmix/logger"

import { loadApiConfig } from "./config"
import { createApiResources } from "./resources"

// Only the entry point and Nitro lifecycle plugin import this process-wide composition root.
export const config = loadApiConfig(process.env)
export const logger = configureLogger("voidmix-api")
export const resources = createApiResources(config)
