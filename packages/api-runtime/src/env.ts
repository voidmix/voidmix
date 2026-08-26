import { databaseEnv } from "@voidmix/db/env";
import { cacheEnv } from "@voidmix/cache/env";
import { type Preset, z } from "@voidmix/env";
import { runtimeEnv } from "@voidmix/env/runtime";
import type { LogLevel } from "@voidmix/logger";
import { loggerEnv } from "@voidmix/logger/env";
import { mailEnv } from "@voidmix/mail/env";

const splitOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const apiRuntimeEnv = {
  id: "api-runtime",
  extends: [runtimeEnv, loggerEnv, databaseEnv, mailEnv, cacheEnv],
  server: {
    ALLOWED_ORIGINS: z
      .string()
      .default("http://localhost:3000")
      .transform(splitOrigins)
      .pipe(z.array(z.url())),
    AUTH_SECRET: z.string().trim().min(32).default("voidmix-development-secret-change-me"),
    AUTH_URL: z.url(),
    AUTH_DOMAIN: z.string().trim().min(1).optional(),
  },
} as const satisfies Preset;

export interface ApiRuntimeEnvironment {
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL: string;
  REDIS_URL?: string | undefined;
  CACHE_PREFIX: string;
  CACHE_REDIS_CONNECT_TIMEOUT_MS: number;
  CACHE_REDIS_OPERATION_TIMEOUT_MS: number;
  CACHE_REDIS_MAX_RETRIES_PER_REQUEST: number;
  ALLOWED_ORIGINS: string[];
  AUTH_SECRET: string;
  AUTH_URL: string;
  AUTH_DOMAIN?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  MAIL_FROM?: string | undefined;
  MAIL_FROM_NAME?: string | undefined;
  EMAIL_TEMPLATES_BASE_URL?: string | undefined;
  MAIL_DEFAULT_LOCALE?: string | undefined;
  LOG_LEVEL?: LogLevel | undefined;
  LOG_PRETTY?: boolean | undefined;
}
