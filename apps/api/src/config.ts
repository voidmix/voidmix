import type { ObjectStorageOptions } from "@voidmix/storage/client"

type Environment = Record<string, string | undefined>

function required(env: Environment, name: string) {
  const value = env[name]?.trim()
  if (!value) throw new Error(`请配置服务端环境变量 ${name}。`)
  return value
}

/** An explicit empty string disables a list; only an absent value uses the fallback. */
function list(value: string | undefined, fallback: readonly string[] = []) {
  return value === undefined
    ? [...fallback]
    : value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
}

/** Snapshot process configuration once. Importing this module has no runtime side effects. */
export function loadApiConfig(env: Environment) {
  const developmentOrigins =
    env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:8081",
          "http://127.0.0.1:8081",
        ]
      : []
  const corsDefaults =
    env.NODE_ENV === "production" ? [] : ["http://localhost:8081", "http://127.0.0.1:8081"]

  // Disabled capabilities do not require credentials. Enabled S3 must be complete at startup.
  const storage: ObjectStorageOptions | undefined = env.S3_BUCKET?.trim()
    ? {
        endpoint: required(env, "S3_ENDPOINT"),
        bucket: required(env, "S3_BUCKET"),
        region: required(env, "S3_REGION"),
        accessKeyId: required(env, "S3_ACCESS_KEY_ID"),
        secretAccessKey: required(env, "S3_SECRET_ACCESS_KEY"),
        prefix: env.S3_PREFIX?.trim() || "voidmix",
      }
    : undefined

  return {
    databaseUrl: required(env, "DATABASE_URL"),
    auth: {
      baseURL: required(env, "BETTER_AUTH_URL"),
      secret: required(env, "BETTER_AUTH_SECRET"),
      trustedOrigins: [...developmentOrigins, ...list(env.AUTH_TRUSTED_ORIGINS)],
    },
    corsOrigins: list(env.CORS_ORIGINS, corsDefaults),
    redisUrl: env.REDIS_URL?.trim() || undefined,
    storage,
  }
}

export type ApiConfig = ReturnType<typeof loadApiConfig>
