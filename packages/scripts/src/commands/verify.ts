import { contextualCommand } from "../runtime/command.js";
import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

interface VerifyDependencies extends RepositoryProcessDependencies {
  verifyI18n: () => Promise<void>;
  verifyPolicy: () => Promise<void>;
  verifyRuntimes: (options: { captureOutput: boolean }) => Promise<void>;
}

export interface VerifyOptions {
  verbose?: boolean;
}

/** Explicit ordered gates keep task selection separate from subprocess execution. */
const processGates = [
  { task: "format", command: ["vp", "fmt", "--check"] },
  { task: "lint", command: ["vp", "lint"] },
  { task: "shared:build", command: ["vp", "run", "@voidmix/shared#build"] },
  { task: "check", command: ["vp", "run", "-r", "check"] },
  { task: "test", command: ["vp", "run", "-r", "test"] },
  {
    task: "build",
    command: [
      "vp",
      "run",
      "--filter",
      "./apps/*",
      "--filter",
      "./packages/*",
      "--filter",
      "!@voidmix/shared",
      "build",
    ],
    env: { NITRO_PRESET: "bun" },
  },
] satisfies Array<{ task: string; command: string[]; env?: NodeJS.ProcessEnv }>;

export async function runVerify(
  dependencies: VerifyDependencies,
  options: VerifyOptions = {},
): Promise<void> {
  const captureOutput = !(options.verbose ?? false);
  dependencies.log("info", "verify.task.started", { task: "i18n" });
  await dependencies.verifyI18n();
  // Policy follows i18n before expensive subprocess gates so structural
  // failures never wait for a build.
  dependencies.log("info", "verify.task.started", { task: "policy" });
  await dependencies.verifyPolicy();

  for (const { command, task, env } of processGates) {
    dependencies.log("info", "verify.task.started", { task });
    await dependencies.runCommand(command, {
      captureOutput,
      cwd: dependencies.repositoryRoot,
      env: env ? { ...dependencies.processEnv, ...env } : dependencies.processEnv,
    });
  }
  dependencies.log("info", "verify.task.started", { task: "runtime" });
  await dependencies.verifyRuntimes({ captureOutput });
  dependencies.log("info", "verify.completed");
}

export const verifyCommand = contextualCommand("verify", "process", {
  meta: {
    name: "verify",
    description:
      "Run every repository gate: policy, format, lint, shared build, checks, tests, builds, runtimes",
  },
  args: {
    verbose: {
      type: "boolean",
      default: false,
      description: "Show full output from formatting, linting, checks, tests, and builds",
    },
  },
  async run(context, { args }) {
    const [
      { verifyNitroRuntimes },
      { createI18nDependencies, runI18nCheck },
      i18nReport,
      policyRuntime,
      policyChecks,
      policyReport,
    ] = await Promise.all([
      import("../verify/nitro.js"),
      import("../i18n/runtime.js"),
      import("../i18n/report.js"),
      import("../policy/runtime.js"),
      import("../policy/checks.js"),
      import("../policy/report.js"),
    ]);
    const dependencies = context;
    await runVerify(
      {
        ...dependencies,
        async verifyI18n() {
          const report = await runI18nCheck(createI18nDependencies());
          if (report.errors > 0) {
            throw new Error(i18nReport.renderI18nReport(report));
          }
        },
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
  },
});
