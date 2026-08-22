import { defineCommand } from "citty";

import { runContextualAction } from "../runtime/action.js";
import type { ScriptsLog } from "../runtime/logger.js";

export interface CleanDependencies {
  cleanRepository(repositoryRoot: string): Promise<string[]>;
  log: ScriptsLog;
  repositoryRoot: string;
}

export async function runClean(dependencies: CleanDependencies): Promise<void> {
  dependencies.log("info", "clean.started");
  const removed = await dependencies.cleanRepository(dependencies.repositoryRoot);
  dependencies.log("info", "clean.completed", { removed, removedCount: removed.length });
}

export const cleanCommand = defineCommand({
  meta: {
    name: "clean",
    description: "Remove rebuildable repository outputs and caches",
  },
  async run() {
    await runContextualAction("clean", "process", async (context) => {
      const { cleanRepository } = await import("../clean.js");
      await runClean({ ...context, cleanRepository });
    });
  },
});
