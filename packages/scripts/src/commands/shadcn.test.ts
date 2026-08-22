import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { readShadcnComponents, runShadcnUpdate } from "./shadcn.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

async function manifestFixture(content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "voidmix-shadcn-"));
  temporaryDirectories.push(directory);
  const filePath = join(directory, "shadcn-components.json");
  await writeFile(filePath, content);
  return filePath;
}

describe("readShadcnComponents", () => {
  it("returns the tracked component names", async () => {
    const filePath = await manifestFixture(JSON.stringify({ components: ["button", "avatar"] }));

    await expect(readShadcnComponents(filePath)).resolves.toEqual(["button", "avatar"]);
  });

  it("rejects a manifest with no components", async () => {
    const filePath = await manifestFixture(JSON.stringify({ components: [] }));

    await expect(readShadcnComponents(filePath)).rejects.toThrow(/at least one component/);
  });

  it("rejects a manifest with a non-string entry", async () => {
    const filePath = await manifestFixture(JSON.stringify({ components: ["button", 42] }));

    await expect(readShadcnComponents(filePath)).rejects.toThrow(/at least one component/);
  });
});

describe("runShadcnUpdate", () => {
  it("runs shadcn add for every tracked component", async () => {
    const runCommand = vi.fn(async () => undefined);
    const dependencies = {
      log: vi.fn(),
      processEnv: { TEST_VALUE: "value" },
      repositoryRoot: "/repo",
      runCommand,
      readComponents: vi.fn(async () => ["button", "avatar"]),
    };

    await runShadcnUpdate(dependencies);

    expect(dependencies.readComponents).toHaveBeenCalledWith(
      "/repo/packages/ui/shadcn-components.json",
    );
    expect(runCommand).toHaveBeenCalledWith(
      [
        "bunx",
        "shadcn@latest",
        "add",
        "button",
        "avatar",
        "--yes",
        "--overwrite",
        "--cwd",
        "packages/ui",
      ],
      { cwd: "/repo", env: dependencies.processEnv },
    );
  });
});
