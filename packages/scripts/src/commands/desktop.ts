import { defineCommand } from "citty";

import { runContextualAction } from "../runtime/action.js";
import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

export async function runDesktopBuild(dependencies: RepositoryProcessDependencies): Promise<void> {
  dependencies.log("info", "desktop.build.started");
  // Tauri's DMG bundler uses CI to skip Finder AppleScript automation. That
  // keeps the repository build deterministic on machines without Automation
  // permission while still producing the .app and DMG bundles.
  const desktopBuildEnv = { ...dependencies.processEnv, CI: "true" };
  await dependencies.runCommand(["bun", "run", "--cwd", "apps/desktop", "tauri", "build"], {
    cwd: dependencies.repositoryRoot,
    env: desktopBuildEnv,
  });
  dependencies.log("info", "desktop.build.completed");
}

const buildDesktopCommand = defineCommand({
  meta: { name: "build", description: "Build the Tauri desktop application" },
  async run() {
    await runContextualAction("desktop build", "repository", async (context) => {
      const { runCommand } = await import("../runtime/process.js");
      await runDesktopBuild({ ...context, runCommand });
    });
  },
});

export const desktopCommand = defineCommand({
  meta: { name: "desktop", description: "Manage the Voidmix desktop application" },
  subCommands: { build: buildDesktopCommand },
});
