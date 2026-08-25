import { defineCommand } from "citty";

import { runContextualAction } from "../runtime/action.js";
import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

interface VerifyDependencies extends RepositoryProcessDependencies {
  verifyPolicy: () => Promise<void>;
  verifyRuntimes: (options: { captureOutput: boolean }) => Promise<void>;
}

export interface VerifyOptions {
  verbose?: boolean;
}

/**
 * Formatting and linting are root-level Vite+ commands rather than per-workspace
 * tasks, so they cannot join the `vp run -r` loop below.
 */
const rootGates = [
  { command: ["vp", "fmt", "--check"], task: "format" },
  { command: ["vp", "lint"], task: "lint" },
] as const;

export async function runVerify(
  dependencies: VerifyDependencies,
  options: VerifyOptions = {},
): Promise<void> {
  const captureOutput = !(options.verbose ?? false);
  // Repository policy runs first: it costs milliseconds and its failures are
  // structural, so there is no point building before it passes.
  dependencies.log("info", "verify.task.started", { task: "policy" });
  await dependencies.verifyPolicy();

  // Then the seconds-long gates, before the minutes-long ones. A contributor who
  // only ever runs this command must still be stopped by an unformatted file;
  // leaving format and lint out of it made CI the only place they were caught.
  for (const { command, task } of rootGates) {
    dependencies.log("info", "verify.task.started", { task });
    await dependencies.runCommand(command, {
      captureOutput,
      cwd: dependencies.repositoryRoot,
      env: dependencies.processEnv,
    });
  }

  for (const task of ["check", "test", "build"] as const) {
    dependencies.log("info", "verify.task.started", { task });
    await dependencies.runCommand(["vp", "run", "-r", task], {
      captureOutput,
      cwd: dependencies.repositoryRoot,
      env:
        task === "build"
          ? { ...dependencies.processEnv, NITRO_PRESET: "bun" }
          : dependencies.processEnv,
    });
  }
  dependencies.log("info", "verify.task.started", { task: "runtime" });
  await dependencies.verifyRuntimes({ captureOutput });
  dependencies.log("info", "verify.completed");
}

export const verifyCommand = defineCommand({
  meta: {
    name: "verify",
    description: "Run every repository gate: policy, format, lint, checks, tests, builds, runtimes",
  },
  args: {
    verbose: {
      type: "boolean",
      default: false,
      description: "Show full output from formatting, linting, checks, tests, and builds",
    },
  },
  async run({ args }) {
    await runContextualAction("verify", "process", async (context) => {
      const [{ runCommand }, { verifyNitroRuntimes }, policyRuntime, policyChecks, policyReport] =
        await Promise.all([
          import("../runtime/process.js"),
          import("../verify/nitro.js"),
          import("../policy/runtime.js"),
          import("../policy/checks.js"),
          import("../policy/report.js"),
        ]);
      const dependencies = { ...context, runCommand };
      await runVerify(
        {
          ...dependencies,
          verifyRuntimes: (options) => verifyNitroRuntimes(dependencies, options),
          async verifyPolicy() {
            const report = await policyChecks.runPolicy(policyRuntime.createPolicyDependencies());
            if (report.errors > 0) {
              throw new Error(policyReport.renderPolicyReport(report));
            }
          },
        },
        { verbose: args.verbose },
      );
    });
  },
});
