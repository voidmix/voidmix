import { createApiRuntime, type ApiRuntime } from "@voidmix/api-runtime";

import { env } from "./env.js";

let runtimePromise: Promise<ApiRuntime> | undefined;

export function getWebApiRuntime(): Promise<ApiRuntime> {
  runtimePromise ??= createApiRuntime({ environment: env });
  return runtimePromise;
}

export async function closeWebApiRuntime(): Promise<void> {
  const runtime = await runtimePromise;
  await runtime?.close();
}
