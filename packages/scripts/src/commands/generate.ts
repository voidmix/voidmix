import { defineCommand } from "citty";

import { runContextualAction } from "../runtime/action.js";
import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

/**
 * Route trees are deliberately absent here. `tsr generate` does not know about
 * TanStack Start, so it writes a route tree without the `Register` footer that
 * `@tanstack/start-plugin-core` appends — a strictly worse file that still passes
 * `tsc`. The Start Vite plugin owns those files; `dev` and `build` produce them.
 */
export async function runGenerate(
  dependencies: RepositoryProcessDependencies,
  // `drizzle-kit generate` exits 2 and asks for `--hints '<json-array>'` when a
  // diff is ambiguous, so extra flags have to reach it unchanged.
  extraArgs: readonly string[] = [],
): Promise<void> {
  dependencies.log("info", "generate.started");
  for (const [workspace, script] of [["packages/db", "generate"]] as const) {
    await dependencies.runCommand(["bun", "run", "--cwd", workspace, script, ...extraArgs], {
      cwd: dependencies.repositoryRoot,
      env: dependencies.processEnv,
    });
  }
  dependencies.log("info", "generate.completed");
}

export const generateCommand = defineCommand({
  meta: { name: "generate", description: "Regenerate database artifacts" },
  async run({ rawArgs }) {
    await runContextualAction("generate", "repository", async (context) => {
      const { runCommand } = await import("../runtime/process.js");
      await runGenerate({ ...context, runCommand }, rawArgs);
    });
  },
});
