import { describe, expect, it, vi } from "vite-plus/test";

import { runClean } from "./clean.js";
import { runDesktopBuild } from "./desktop.js";
import { runGenerate } from "./generate.js";
import { runVerify } from "./verify.js";

function dependencies() {
  const runCommand = vi.fn(
    async (_command: readonly string[], _options: { cwd: string; env: NodeJS.ProcessEnv }) =>
      undefined,
  );
  return {
    log: vi.fn(),
    processEnv: { TEST_VALUE: "value" },
    repositoryRoot: "/repo",
    runCommand,
    verifyPolicy: vi.fn(async () => undefined),
    verifyRuntimes: vi.fn(async () => undefined),
  };
}

describe("repository workflows", () => {
  it("clears the Bun cache before removing optional repository dependencies", async () => {
    const deps = {
      ...dependencies(),
      cleanRepository: vi.fn(async () => ["node_modules"]),
    };

    await runClean(deps, { bunCache: true, dependencies: true });

    expect(deps.runCommand).toHaveBeenCalledWith(["bun", "pm", "cache", "rm"], {
      cwd: "/repo",
      env: deps.processEnv,
    });
    expect(deps.cleanRepository).toHaveBeenCalledWith("/repo", { dependencies: true });
    expect(deps.log).toHaveBeenLastCalledWith("info", "clean.completed", {
      bunCache: true,
      dependencies: true,
      removed: ["node_modules"],
      removedCount: 1,
    });
  });

  it("generates database artifacts", async () => {
    const deps = dependencies();

    await runGenerate(deps);

    expect(deps.runCommand.mock.calls.map(([command]) => command)).toEqual([
      ["bun", "run", "--cwd", "packages/db", "generate"],
    ]);
  });

  it("forwards extra flags to drizzle-kit generate", async () => {
    const deps = dependencies();

    await runGenerate(deps, ["--hints", "[]"]);

    expect(deps.runCommand.mock.calls.map(([command]) => command)).toEqual([
      ["bun", "run", "--cwd", "packages/db", "generate", "--hints", "[]"],
    ]);
  });

  it("does not regenerate route trees, which the Start plugin owns", async () => {
    const deps = dependencies();

    await runGenerate(deps);

    const commands = deps.runCommand.mock.calls.map(([command]) => command.join(" "));
    expect(commands.some((command) => command.includes("generate-routes"))).toBe(false);
  });

  it("builds Desktop with the repository environment", async () => {
    const deps = dependencies();

    await runDesktopBuild(deps);

    expect(deps.runCommand).toHaveBeenCalledWith(
      ["bun", "run", "--cwd", "apps/desktop", "tauri", "build"],
      { cwd: "/repo", env: deps.processEnv },
    );
  });

  // This sequence is the definition of "everything is checked". A gate missing
  // from it is a gate a contributor who runs only `bun run verify` never meets,
  // which is why it is asserted whole rather than by membership.
  it("runs every gate, cheapest first", async () => {
    const deps = dependencies();

    await runVerify(deps);

    expect(deps.runCommand.mock.calls.map(([command]) => command)).toEqual([
      ["vp", "fmt", "--check"],
      ["vp", "lint"],
      ["vp", "run", "-r", "check"],
      ["vp", "run", "-r", "test"],
      ["vp", "run", "-r", "build"],
    ]);
    expect(deps.runCommand.mock.calls.map(([, options]) => options.env)).toEqual([
      deps.processEnv,
      deps.processEnv,
      deps.processEnv,
      deps.processEnv,
      { ...deps.processEnv, NITRO_PRESET: "bun" },
    ]);
    expect(deps.verifyRuntimes).toHaveBeenCalledOnce();
  });

  it("checks formatting before spending minutes on a build", async () => {
    const deps = dependencies();
    deps.runCommand = vi.fn(async (command: readonly string[]) => {
      if (command.includes("fmt")) throw new Error("Format issues found");
    });

    await expect(runVerify(deps)).rejects.toThrow("Format issues found");
    expect(deps.runCommand.mock.calls.map(([command]) => command)).toEqual([
      ["vp", "fmt", "--check"],
    ]);
    expect(deps.verifyRuntimes).not.toHaveBeenCalled();
  });

  it("checks repository policy before spending time on builds", async () => {
    const deps = dependencies();
    deps.verifyPolicy = vi.fn(async () => {
      throw new Error("Policy: 1 errors, 0 warnings.");
    });

    await expect(runVerify(deps)).rejects.toThrow("Policy: 1 errors");
    expect(deps.runCommand).not.toHaveBeenCalled();
    expect(deps.verifyRuntimes).not.toHaveBeenCalled();
  });
});
