import { databaseEnv } from "@voidmix/db/env";
import { createEnv, type Preset, z } from "@voidmix/env";
import { runtimeEnv } from "@voidmix/env/runtime";
import { loggerEnv } from "@voidmix/logger/env";
import { mailEnv } from "@voidmix/mail/env";

const splitOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const apiEnv = {
  id: "api",
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
    AUTH_URL: z.url().default("http://localhost:3002"),
    AUTH_DOMAIN: z.string().trim().min(1).optional(),
  },
} as const satisfies Preset;

export const env = createEnv(apiEnv);

export type ApiEnvironment = typeof env;
