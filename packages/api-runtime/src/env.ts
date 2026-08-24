import { databaseEnv } from "@voidmix/db/env";
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
  extends: [runtimeEnv, loggerEnv, databaseEnv, mailEnv],
  server: {
    ALLOWED_ORIGINS: z
      .string()
      .default("http://localhost:3000")
      .transform(splitOrigins)
      .pipe(z.array(z.url())),
    VOIDMIX_ACTOR_ID: z.string().trim().min(1).optional(),
    VOIDMIX_ACTOR_ROLE: z.enum(["user", "admin", "owner"]).default("user"),
    AUTH_SECRET: z.string().trim().min(32).default("voidmix-development-secret-change-me"),
    AUTH_URL: z.url(),
    AUTH_DOMAIN: z.string().trim().min(1).optional(),
  },
} as const satisfies Preset;

export interface ApiRuntimeEnvironment {
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL: string;
  ALLOWED_ORIGINS: string[];
  VOIDMIX_ACTOR_ID?: string | undefined;
  VOIDMIX_ACTOR_ROLE: "user" | "admin" | "owner";
  AUTH_SECRET: string;
  AUTH_URL: string;
  AUTH_DOMAIN?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  MAIL_FROM?: string | undefined;
  MAIL_FROM_NAME: string;
  EMAIL_TEMPLATES_BASE_URL?: string | undefined;
  LOG_LEVEL?: LogLevel | undefined;
  LOG_PRETTY?: boolean | undefined;
}
