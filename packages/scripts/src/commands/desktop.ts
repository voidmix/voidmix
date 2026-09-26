import { defineCommand } from "citty";

import { contextualCommand } from "../runtime/command.js";
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

const buildDesktopCommand = contextualCommand("desktop build", "repository", {
  meta: { name: "build", description: "Build the Tauri desktop application" },
  async run(context) {
    await runDesktopBuild(context);
  },
});

export const desktopCommand = defineCommand({
  meta: { name: "desktop", description: "Manage the Voidmix desktop application" },
  subCommands: { build: buildDesktopCommand },
});
