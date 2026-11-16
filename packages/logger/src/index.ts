import {
  auditRedactPreset,
  defineEvlog,
  initLogger,
  toLoggerConfig,
  type EvlogConfig,
  type LogLevel,
} from "evlog"

export {
  createError,
  createLogger,
  log,
  parseError,
  toMiddlewareOptions,
  type AuditableLogger,
  type DrainContext,
  type EvlogConfig,
  type LogLevel,
  type RequestLogger,
  type WideEvent,
} from "evlog"

const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"]

export type LoggerOptions = Pick<EvlogConfig, "drain" | "silent"> & {
  env?: Record<string, string | undefined>
}

/** Initialize once at the application entry point, before handling requests. */
export function configureLogger(service: string, options: LoggerOptions = {}) {
  const { env = process.env, drain, silent } = options
  const environment = env.NODE_ENV || "development"
  const format = env.LOG_FORMAT?.trim() || (environment === "development" ? "pretty" : "json")
  if (format !== "json" && format !== "pretty") {
    throw new Error("LOG_FORMAT 必须是 json 或 pretty。")
  }
  const level = env.LOG_LEVEL?.trim() || "info"
  const minimum = levels.findIndex((value) => value === level)
  if (minimum === -1) throw new Error(`LOG_LEVEL 必须是 ${levels.join("、")} 之一。`)
  const minLevel = levels[minimum]!

  const config = defineEvlog({
    service,
    environment,
    pretty: format === "pretty",
    stringify: true,
    silent,
    drain,
    minLevel,
    // evlog's minLevel applies to simple logs; rates also filter wide events.
    sampling: {
      rates: Object.fromEntries(levels.map((value, index) => [value, index >= minimum ? 100 : 0])),
    },
    redact: {
      paths: [
        ...(auditRedactPreset.paths ?? []),
        "device_code",
        "user_code",
        "accessKeyId",
        "secretAccessKey",
        "access_key_id",
        "secret_access_key",
      ],
      builtins: [
        "creditCard",
        "email",
        "ipv4",
        "phone",
        "jwt",
        "bearer",
        "iban",
        "secrets",
        "apiKeys",
        "privateKey",
        "urlPassword",
      ],
    },
  })
  initLogger(toLoggerConfig(config))
  return config
}
