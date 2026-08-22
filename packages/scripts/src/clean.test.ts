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
      ".vite-plus/cache/state.json",
      "apps/web/dist/index.html",
      "apps/web/.output/server/index.mjs",
      "apps/web/node_modules/.vite/metadata.json",
      "packages/domain/coverage/coverage.json",
      "e2e/test-results/results.json",
      "apps/desktop/src-tauri/target/debug/voidmix",
    ];
    const preservedPaths = [
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
    expect(removed).toEqual([
      ".vite-plus",
      "e2e/test-results",
      "apps/web/.output",
      "apps/web/dist",
      "apps/web/node_modules/.vite",
      "packages/domain/coverage",
      "apps/desktop/src-tauri/target",
    ]);
  });
});
