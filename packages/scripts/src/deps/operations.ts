import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

export type DependencyMaintenanceDependencies = RepositoryProcessDependencies;

const tazeOptions = [
  "minor",
  "-r",
  "-l",
  "--exclude",
  "vitest@4",
  "--exclude",
  "@vitest/coverage-v8@4",
  "--exclude",
  "bun",
  "--exclude",
  "node",
] as const;

async function runDependencyCommand(
  dependencies: DependencyMaintenanceDependencies,
  command: readonly string[],
): Promise<void> {
  await dependencies.runCommand(command, {
    cwd: dependencies.repositoryRoot,
    env: dependencies.processEnv,
  });
}

export async function runDependencyCheck(
  dependencies: DependencyMaintenanceDependencies,
): Promise<void> {
  dependencies.log("info", "deps.check.started");
  await runDependencyCommand(dependencies, ["taze", ...tazeOptions, "--fail-on-outdated"]);
  dependencies.log("info", "deps.check.completed");
}

export async function runDependencyUpdate(
  dependencies: DependencyMaintenanceDependencies,
): Promise<void> {
  dependencies.log("info", "deps.update.started");
  await runDependencyCommand(dependencies, ["taze", ...tazeOptions, "-w"]);
  await runDependencyCommand(dependencies, ["bun", "install"]);
  dependencies.log("info", "deps.update.completed");
}

export async function runDedupe(
  dependencies: DependencyMaintenanceDependencies,
  options: { check?: boolean } = {},
): Promise<void> {
  const check = options.check ?? false;
  const command = ["bun", "dedupe", ...(check ? ["--check"] : [])] as const;
  dependencies.log("info", "deps.dedupe.started", { check });
  await dependencies.runCommand(command, {
    cwd: dependencies.repositoryRoot,
    env: dependencies.processEnv,
  });
  dependencies.log("info", "deps.dedupe.completed", { check });
}

export async function runAudit(dependencies: DependencyMaintenanceDependencies): Promise<void> {
  dependencies.log("info", "deps.audit.started");
  await dependencies.runCommand(["bun", "audit"], {
    cwd: dependencies.repositoryRoot,
    env: dependencies.processEnv,
  });
  dependencies.log("info", "deps.audit.completed");
}
