import { logger } from "@voidmix/logger";
import { definePlugin } from "nitro";

import { closeWebApiRuntime, getWebApiRuntime } from "./runtime.js";

export default definePlugin(async (nitroApp) => {
  await getWebApiRuntime();

  const started = logger({ operation: "web.api.started" });
  started.set({ runtime: "nitro", outcome: "success" });
  started.emit();

  nitroApp.hooks.hook("close", async () => {
    const stopping = logger({ operation: "web.api.stopping" });
    stopping.set({ runtime: "nitro", outcome: "started" });
    try {
      await closeWebApiRuntime();
      stopping.set({ outcome: "success" });
    } catch (error) {
      stopping.error(error instanceof Error ? error : String(error));
      throw error;
    } finally {
      stopping.emit();
    }
  });
});
