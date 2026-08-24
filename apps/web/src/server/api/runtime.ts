import { createApiRuntime, type ApiRuntime } from "@voidmix/api-runtime";
import { logger } from "@voidmix/logger";

import { env } from "../../env.js";

let runtimePromise: Promise<ApiRuntime> | undefined;

export function getWebApiRuntime(): Promise<ApiRuntime> {
  runtimePromise ??= createApiRuntime({
    environment: env,
    onError: (error) => {
      const log = logger({ operation: "api.error" });
      log.error(error instanceof Error ? error : String(error));
      log.emit();
    },
  });
  return runtimePromise;
}

export async function closeWebApiRuntime(): Promise<void> {
  const runtime = await runtimePromise;
  await runtime?.close();
}
