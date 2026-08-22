import { describe, expect, it, vi } from "vite-plus/test";

import { runAudit, runDedupe, type DependencyMaintenanceDependencies } from "./operations.js";

function dependencies() {
  const log = vi.fn();
  const runCommand = vi.fn(async () => undefined);
  const deps: DependencyMaintenanceDependencies = {
    log,
    runCommand,
    processEnv: { TEST_VALUE: "value" },
    repositoryRoot: "/repo",
  };
  return { deps, log, runCommand };
}

describe("dependency maintenance", () => {
  it("runs Bun dedupe with the repository environment", async () => {
    const { deps, log, runCommand } = dependencies();
    await runDedupe(deps);

    expect(runCommand).toHaveBeenCalledWith(["bun", "dedupe"], {
      cwd: "/repo",
      env: deps.processEnv,
    });
    expect(log).toHaveBeenNthCalledWith(1, "info", "deps.dedupe.started", { check: false });
    expect(log).toHaveBeenNthCalledWith(2, "info", "deps.dedupe.completed", { check: false });
  });

  it("checks dedupe without changing the lockfile", async () => {
    const { deps, runCommand } = dependencies();
    await runDedupe(deps, { check: true });

    expect(runCommand).toHaveBeenCalledWith(["bun", "dedupe", "--check"], {
      cwd: "/repo",
      env: deps.processEnv,
    });
  });

  it("runs the read-only Bun security audit", async () => {
    const { deps, log, runCommand } = dependencies();
    await runAudit(deps);

    expect(runCommand).toHaveBeenCalledWith(["bun", "audit"], {
      cwd: "/repo",
      env: deps.processEnv,
    });
    expect(log).toHaveBeenNthCalledWith(1, "info", "deps.audit.started");
    expect(log).toHaveBeenNthCalledWith(2, "info", "deps.audit.completed");
  });

  it("does not log completion when Bun fails", async () => {
    const { deps, log } = dependencies();
    deps.runCommand = vi.fn(async () => {
      throw new Error("bun failed");
    });

    await expect(runAudit(deps)).rejects.toThrow("bun failed");
    expect(log).toHaveBeenCalledTimes(1);
  });
});
