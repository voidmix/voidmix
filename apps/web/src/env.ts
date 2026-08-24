import { createEnv, type Preset } from "@voidmix/env";
import { runtimeEnv } from "@voidmix/env/runtime";
import { loggerEnv } from "@voidmix/logger/env";

export const webEnv = {
  id: "web",
  extends: [runtimeEnv, loggerEnv],
} as const satisfies Preset;

export const env = createEnv(webEnv);
