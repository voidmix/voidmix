import { createEnv, type Preset, z } from "@voidmix/env";
import { runtimeEnv } from "@voidmix/env/runtime";
import { loggerEnv } from "@voidmix/logger/env";

export const webEnv = {
  id: "web",
  extends: [runtimeEnv, loggerEnv],
  client: {
    VITE_API_URL: z.url().default("http://localhost:3002"),
  },
} as const satisfies Preset;

export const env = createEnv(webEnv);
