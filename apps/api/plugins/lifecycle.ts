import { logger } from "@voidmix/logger";
import { definePlugin } from "nitro";

import { apiRuntime } from "../src/runtime.js";

export default definePlugin((nitroApp) => {
  const started = logger({ operation: "api.started" });
  started.set({ runtime: "nitro", outcome: "success" });
  started.emit();

  nitroApp.hooks.hook("close", async () => {
    const stopping = logger({ operation: "api.stopping" });
    stopping.set({ runtime: "nitro", outcome: "started" });
    try {
      await apiRuntime.close();
      stopping.set({ outcome: "success" });
    } catch (error) {
      stopping.error(error instanceof Error ? error : String(error));
      throw error;
    } finally {
      stopping.emit();
    }
  });
});
