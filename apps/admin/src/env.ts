import { createEnv, type Preset, z } from "@voidmix/env";
import { runtimeEnv } from "@voidmix/env/runtime";
import { loggerEnv } from "@voidmix/logger/env";

export const adminEnv = {
  id: "admin",
  extends: [runtimeEnv, loggerEnv],
  client: {
    VITE_API_URL: z.url().default("http://localhost:3002"),
    VITE_ACTOR_ID: z.string().trim().min(1).default("owner-local"),
    VITE_ACTOR_ROLE: z.enum(["user", "admin", "owner"]).default("owner"),
  },
} as const satisfies Preset;

export const env = createEnv(adminEnv);
