import { describe, expect, it, vi } from "vite-plus/test";

import { verifyNitroRuntimes, type NitroRuntimeTarget } from "./nitro.js";

const target = {
  directory: "apps/example",
  name: "Example",
  pathname: "/health",
} as const satisfies NitroRuntimeTarget;

function dependencies() {
  return {
    log: vi.fn(),
    processEnv: {
      DATABASE_URL: "postgres://example.invalid/database",
      PATH: "/bin",
      PORT: "9999",
    },
    repositoryRoot: "/repo",
    runCommand: vi.fn(
      async (_command: readonly string[], _options: { cwd: string; env: NodeJS.ProcessEnv }) =>
        undefined,
    ),
  };
}

describe("verifyNitroRuntimes", () => {
  it("checks node-server metadata and starts the output with Node", async () => {
    const deps = dependencies();

    await verifyNitroRuntimes(deps, {
      allocatePort: async () => 43210,
      readMetadata: async () =>
        JSON.stringify({ preset: "node-server", serverEntry: "server/index.mjs" }),
      targets: [target],
    });

    expect(deps.runCommand).toHaveBeenCalledOnce();
    const [command, options] = deps.runCommand.mock.calls[0] ?? [];
    expect(command?.slice(0, 4)).toEqual([
      "node",
      "--input-type=module",
      "--eval",
      expect.any(String),
    ]);
    expect(command?.slice(4)).toEqual([
      "file:///repo/apps/example/.output/server/index.mjs",
      "/health",
      "Example",
    ]);
    expect(options).toEqual({
      cwd: "/repo/apps/example/.output",
      env: expect.objectContaining({
        ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001",
        LOG_LEVEL: "error",
        LOG_PRETTY: "false",
        NITRO_HOST: "127.0.0.1",
        NITRO_PORT: "43210",
        NODE_ENV: "production",
        PATH: "/bin",
        PORT: "43210",
      }),
    });
    expect(options?.env).not.toHaveProperty("DATABASE_URL");
  });

  it("rejects output built for a non-Node preset", async () => {
    const deps = dependencies();

    await expect(
      verifyNitroRuntimes(deps, {
        allocatePort: async () => 43210,
        readMetadata: async () => JSON.stringify({ preset: "bun", serverEntry: "server.mjs" }),
        targets: [target],
      }),
    ).rejects.toThrow("Example Nitro output uses bun instead of node-server");
    expect(deps.runCommand).not.toHaveBeenCalled();
  });

  it("rejects server entries outside the generated output", async () => {
    const deps = dependencies();

    await expect(
      verifyNitroRuntimes(deps, {
        allocatePort: async () => 43210,
        readMetadata: async () =>
          JSON.stringify({ preset: "node-server", serverEntry: "../../secret.mjs" }),
        targets: [target],
      }),
    ).rejects.toThrow("points outside its output directory");
    expect(deps.runCommand).not.toHaveBeenCalled();
  });
});
