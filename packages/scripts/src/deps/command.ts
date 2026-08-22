import { defineCommand } from "citty";

import { runContextualAction } from "../runtime/action.js";
import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

async function runOperation(
  command: "check" | "update" | "dedupe" | "audit",
  action: (dependencies: RepositoryProcessDependencies) => Promise<void>,
): Promise<void> {
  await runContextualAction(`deps ${command}`, "repository", async (context) => {
    const { runCommand } = await import("../runtime/process.js");
    await action({ ...context, runCommand });
  });
}

const checkCommand = defineCommand({
  meta: { name: "check", description: "Check for compatible dependency updates" },
  async run() {
    await runOperation("check", async (dependencies) => {
      const { runDependencyCheck } = await import("./operations.js");
      await runDependencyCheck(dependencies);
    });
  },
});

const updateCommand = defineCommand({
  meta: { name: "update", description: "Write compatible dependency updates and refresh bun.lock" },
  async run() {
    await runOperation("update", async (dependencies) => {
      const { runDependencyUpdate } = await import("./operations.js");
      await runDependencyUpdate(dependencies);
    });
  },
});

const dedupeCommand = defineCommand({
  meta: { name: "dedupe", description: "Remove duplicate dependency versions from bun.lock" },
  args: {
    check: {
      type: "boolean",
      default: false,
      description: "Check for removable duplicates without changing bun.lock",
    },
  },
  async run({ args }) {
    await runContextualAction("deps dedupe", "repository", async (context) => {
      const [{ runCommand }, { runDedupe }] = await Promise.all([
        import("../runtime/process.js"),
        import("./operations.js"),
      ]);
      await runDedupe({ ...context, runCommand }, { check: args.check });
    });
  },
});

const auditCommand = defineCommand({
  meta: { name: "audit", description: "Audit dependencies for known vulnerabilities" },
  async run() {
    await runContextualAction("deps audit", "repository", async (context) => {
      const [{ runCommand }, { runAudit }] = await Promise.all([
        import("../runtime/process.js"),
        import("./operations.js"),
      ]);
      await runAudit({ ...context, runCommand });
    });
  },
});

export const depsCommand = defineCommand({
  meta: { name: "deps", description: "Maintain dependency resolution and security" },
  subCommands: {
    check: checkCommand,
    update: updateCommand,
    dedupe: dedupeCommand,
    audit: auditCommand,
  },
});
