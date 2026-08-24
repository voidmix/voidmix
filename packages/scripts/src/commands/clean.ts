import { defineCommand } from "citty";

import type { CleanRepositoryOptions } from "../clean.js";
import { runContextualAction } from "../runtime/action.js";
import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

export interface CleanDependencies extends RepositoryProcessDependencies {
  cleanRepository(repositoryRoot: string, options?: CleanRepositoryOptions): Promise<string[]>;
}

export interface CleanOptions {
  bunCache?: boolean;
  dependencies?: boolean;
}

export async function runClean(
  dependencies: CleanDependencies,
  options: CleanOptions = {},
): Promise<void> {
  const bunCache = options.bunCache ?? false;
  const includeDependencies = options.dependencies ?? false;
  dependencies.log("info", "clean.started", {
    bunCache,
    dependencies: includeDependencies,
  });

  if (bunCache) {
    await dependencies.runCommand(["bun", "pm", "cache", "rm"], {
      cwd: dependencies.repositoryRoot,
      env: dependencies.processEnv,
    });
  }

  const removed = await dependencies.cleanRepository(dependencies.repositoryRoot, {
    dependencies: includeDependencies,
  });
  dependencies.log("info", "clean.completed", {
    bunCache,
    dependencies: includeDependencies,
    removed,
    removedCount: removed.length,
  });
}

export const cleanCommand = defineCommand({
  meta: {
    name: "clean",
    description: "Remove rebuildable repository outputs and caches",
  },
  args: {
    dependencies: {
      type: "boolean",
      default: false,
      description: "Also remove repository node_modules directories",
    },
    "bun-cache": {
      type: "boolean",
      default: false,
      description: "Also clear Bun's machine-wide install cache",
    },
  },
  async run({ args }) {
    await runContextualAction("clean", "process", async (context) => {
      const [{ cleanRepository }, { runCommand }] = await Promise.all([
        import("../clean.js"),
        import("../runtime/process.js"),
      ]);
      await runClean(
        { ...context, cleanRepository, runCommand },
        { bunCache: args["bun-cache"], dependencies: args.dependencies },
      );
    });
  },
});
