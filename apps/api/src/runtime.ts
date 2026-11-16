import { configureLogger } from "@voidmix/logger"
import { createOtlpLogDrain } from "@voidmix/logger/otlp"

import { loadApiConfig } from "./config"
import { createApiResources } from "./resources"

// Only the entry point and Nitro lifecycle plugin import this process-wide composition root.
export const config = loadApiConfig(process.env)
// Optional: enabled by OTEL_EXPORTER_OTLP_ENDPOINT. The lifecycle plugin flushes it at shutdown.
export const logDrain = createOtlpLogDrain(process.env)
export const logger = configureLogger("voidmix-api", { drain: logDrain })
export const resources = createApiResources(config)
