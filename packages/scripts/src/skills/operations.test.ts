import { describe, expect, it, vi } from "vite-plus/test";

import { runSkillsUpdate } from "./operations.js";

describe("skills maintenance", () => {
  it("runs the repository skill updater non-interactively", async () => {
    const log = vi.fn();
    const runCommand = vi.fn(async () => undefined);
    const dependencies = {
      log,
      processEnv: { TEST_VALUE: "value" },
      repositoryRoot: "/repo",
      runCommand,
    };

    await runSkillsUpdate(dependencies);

    expect(runCommand).toHaveBeenCalledWith(["bunx", "skills", "update", "-p", "-y"], {
      cwd: "/repo",
      env: dependencies.processEnv,
    });
    expect(log).toHaveBeenNthCalledWith(1, "info", "skills.update.started");
    expect(log).toHaveBeenNthCalledWith(2, "info", "skills.update.completed");
  });
});
