import { apiRuntimeEnv } from "@voidmix/api-runtime/env";
import { createEnv, type Preset, z } from "@voidmix/env";

export const webEnv = {
  id: "web",
  extends: [apiRuntimeEnv],
  server: {
    AUTH_URL: z.url().default("http://localhost:3000"),
  },
} as const satisfies Preset;

export const env = createEnv(webEnv);
