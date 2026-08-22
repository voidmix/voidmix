import { createEnv, type Preset, z } from "@voidmix/env";
import { runtimeEnv } from "@voidmix/env/runtime";

export const databaseEnv = {
  id: "database",
  server: {
    DATABASE_URL: z.url().optional(),
    DATABASE_LOCAL_URL: z.url().default("postgres://voidmix:voidmix@localhost:5432/voidmix"),
  },
} as const satisfies Preset;

export function getDatabaseEnv() {
  return createEnv({ extends: [runtimeEnv, databaseEnv] });
}
