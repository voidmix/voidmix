import { databaseEnv } from "@voidmix/db/env";
import { createEnv, type Preset, z } from "@voidmix/env";
import { runtimeEnv } from "@voidmix/env/runtime";
import { loggerEnv } from "@voidmix/logger/env";

const splitOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const apiEnv = {
  id: "api",
  extends: [runtimeEnv, loggerEnv, databaseEnv],
  server: {
    ALLOWED_ORIGINS: z
      .string()
      .default("http://localhost:3000,http://localhost:3001")
      .transform(splitOrigins)
      .pipe(z.array(z.url())),
    VOIDMIX_ACTOR_ID: z.string().trim().min(1).optional(),
    VOIDMIX_ACTOR_ROLE: z.enum(["user", "admin", "owner"]).default("user"),
  },
} as const satisfies Preset;

export const env = createEnv(apiEnv);

export type ApiEnvironment = typeof env;
