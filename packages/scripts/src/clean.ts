import { lstat, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const rootArtifacts = [
  ".tanstack",
  ".vite-plus",
  "coverage",
  "playwright-report",
  "test-results",
] as const;

const workspaceArtifacts = [
  ".output",
  ".tanstack",
  "coverage",
  "dist",
  "node_modules/.nitro",
  "node_modules/.vite",
  "playwright-report",
  "test-results",
] as const;

export async function cleanRepository(repositoryRoot: string): Promise<string[]> {
  const workspaceRoots = await findWorkspaceRoots(repositoryRoot);
  const candidates = [
    ...rootArtifacts.map((path) => join(repositoryRoot, path)),
    ...workspaceRoots.flatMap((workspaceRoot) =>
      workspaceArtifacts.map((path) => join(workspaceRoot, path)),
    ),
    join(repositoryRoot, "apps/desktop/src-tauri/target"),
  ];
  const removed: string[] = [];

  for (const path of candidates) {
    if (!(await pathExists(path))) continue;
    await rm(path, { force: true, recursive: true });
    removed.push(path.slice(repositoryRoot.length + 1));
  }

  return removed;
}

async function findWorkspaceRoots(repositoryRoot: string): Promise<string[]> {
  const roots = [join(repositoryRoot, "e2e")];

  for (const parent of ["apps", "packages"] as const) {
    const parentPath = join(repositoryRoot, parent);
    let entries;
    try {
      entries = await readdir(parentPath, { withFileTypes: true });
    } catch (error) {
      if (isMissingPathError(error)) continue;
      throw error;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) roots.push(join(parentPath, entry.name));
    }
  }

  return roots;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissingPathError(error)) return false;
    throw error;
  }
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
