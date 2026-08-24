import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { cleanRepository } from "./clean.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("cleanRepository", () => {
  it("removes rebuildable artifacts and preserves source and dependencies", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "voidmix-clean-"));
    temporaryDirectories.push(repositoryRoot);

    const removedPaths = [
      ".cache/tool/state.json",
      ".vite/deps/metadata.json",
      ".vite-plus/cache/state.json",
      "build.tsbuildinfo",
      "package.tgz",
      "report.1.2.3.4.json",
      "node_modules/.cache/tool/state.json",
      "apps/storybook/storybook-static/index.html",
      "apps/web/.nitro/cache/state.json",
      "apps/web/dist/index.html",
      "apps/web/.output/server/index.mjs",
      "apps/web/.storage/state.json",
      "apps/web/.vite/deps/metadata.json",
      "apps/web/app.lcov",
      "apps/web/app.tsbuildinfo",
      "apps/web/node_modules/.cache/tool/state.json",
      "apps/web/node_modules/.vite/metadata.json",
      "packages/domain/coverage/coverage.json",
      "e2e/test-results/results.json",
      "apps/desktop/src-tauri/target/debug/voidmix",
      "apps/desktop/src-tauri/gen/schemas/schema.json",
    ];
    const preservedPaths = [
      "node_modules/example/package.json",
      "development.log",
      "apps/web/src/routeTree.gen.ts",
      "apps/web/node_modules/example/package.json",
      "packages/db/drizzle/20260815142252_unusual_leech/migration.sql",
    ];

    await Promise.all(
      [...removedPaths, ...preservedPaths].map(async (path) => {
        const absolutePath = join(repositoryRoot, path);
        await mkdir(join(absolutePath, ".."), { recursive: true });
        await writeFile(absolutePath, "fixture");
      }),
    );

    const removed = await cleanRepository(repositoryRoot);

    for (const path of removedPaths) {
      expect(existsSync(join(repositoryRoot, path))).toBe(false);
    }
    for (const path of preservedPaths) {
      expect(existsSync(join(repositoryRoot, path))).toBe(true);
    }
    expect([...removed].sort()).toEqual(
      [
        ".cache",
        ".vite",
        ".vite-plus",
        "build.tsbuildinfo",
        "package.tgz",
        "report.1.2.3.4.json",
        "node_modules/.cache",
        "e2e/test-results",
        "apps/storybook/storybook-static",
        "apps/web/.nitro",
        "apps/web/.output",
        "apps/web/.storage",
        "apps/web/.vite",
        "apps/web/app.lcov",
        "apps/web/app.tsbuildinfo",
        "apps/web/dist",
        "apps/web/node_modules/.cache",
        "apps/web/node_modules/.vite",
        "packages/domain/coverage",
        "apps/desktop/src-tauri/gen/schemas",
        "apps/desktop/src-tauri/target",
      ].sort(),
    );
  });

  it("removes repository dependencies only when requested", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "voidmix-clean-"));
    temporaryDirectories.push(repositoryRoot);

    const dependencyPaths = [
      "node_modules/root-package/package.json",
      "node_modules.bun/root-package/package.json",
      "apps/web/node_modules/web-package/package.json",
      "apps/web/node_modules.bun/web-package/package.json",
      "packages/domain/node_modules/domain-package/package.json",
    ];
    const sourcePath = "apps/web/src/index.ts";

    await Promise.all(
      [...dependencyPaths, sourcePath].map(async (path) => {
        const absolutePath = join(repositoryRoot, path);
        await mkdir(join(absolutePath, ".."), { recursive: true });
        await writeFile(absolutePath, "fixture");
      }),
    );

    const removed = await cleanRepository(repositoryRoot, { dependencies: true });

    for (const path of dependencyPaths) {
      expect(existsSync(join(repositoryRoot, path))).toBe(false);
    }
    expect(existsSync(join(repositoryRoot, sourcePath))).toBe(true);
    expect([...removed].sort()).toEqual(
      [
        "apps/web/node_modules",
        "apps/web/node_modules.bun",
        "packages/domain/node_modules",
        "node_modules",
        "node_modules.bun",
      ].sort(),
    );
  });
});
