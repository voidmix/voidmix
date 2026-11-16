import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { checkWorkspace } from "../src/commands/workspace"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "voidmix-workspace-"))
  roots.push(root)
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ workspaces: ["apps/*", "packages/*"] }),
  )
  return root
}

async function workspace(
  root: string,
  directory: string,
  manifest: object,
  sources: Record<string, string> = {},
) {
  for (const [file, content] of Object.entries({
    "package.json": JSON.stringify(manifest),
    "README.md": "# Workspace\n",
    ...sources,
  })) {
    const target = join(root, directory, file)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content)
  }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

test("accepts declared public exports, including wildcard subpaths and type imports", async () => {
  const root = await fixture()
  await workspace(root, "packages/api", {
    name: "@voidmix/api",
    exports: { "./types/*": "./src/*.ts" },
  })
  await workspace(
    root,
    "apps/web",
    { name: "@voidmix/web", dependencies: { "@voidmix/api": "workspace:*" } },
    {
      "src/index.ts": 'import type { User } from "@voidmix/api/types/user"',
    },
  )
  expect(await checkWorkspace(root)).toMatchObject({ ok: true, workspaceCount: 2, sourceCount: 1 })
})

test("rejects undeclared dependencies and private workspace imports", async () => {
  const root = await fixture()
  await workspace(root, "packages/api", {
    name: "@voidmix/api",
    exports: { "./client": "./src/client.ts" },
  })
  await workspace(
    root,
    "apps/web",
    { name: "@voidmix/web" },
    {
      "src/index.ts": 'import "@voidmix/api/internal"; export { z } from "zod"',
    },
  )
  const report = await checkWorkspace(root)
  expect(report.ok).toBe(false)
  expect(report.issues.map((issue) => issue.message).join("\n")).toContain("not a public export")
  expect(report.issues.filter((issue) => issue.message.startsWith("Declare"))).toHaveLength(2)
})

test("rejects source-directory shortcuts but permits integration tests of real adapters", async () => {
  const root = await fixture()
  await workspace(
    root,
    "packages/logger",
    { name: "@voidmix/logger" },
    {
      "src/index.ts": 'import "../../../apps/api/server"',
      "tests/logger.test.ts": 'import "../../../apps/api/server"',
    },
  )
  const report = await checkWorkspace(root)
  expect(report.issues).toHaveLength(1)
  expect(report.issues[0]!.file).toBe("packages/logger/src/index.ts")
})

test("rejects server dependencies in browser-facing modules", async () => {
  const root = await fixture()
  await workspace(root, "packages/db", {
    name: "@voidmix/db",
    exports: { "./client": "./src/client.ts" },
  })
  await workspace(
    root,
    "apps/web",
    { name: "@voidmix/web", dependencies: { "@voidmix/db": "workspace:*" } },
    {
      "src/index.ts": 'import "@voidmix/db/client"',
      "src/server/db.ts": 'import "@voidmix/db/client"',
    },
  )
  const report = await checkWorkspace(root)
  expect(report.issues).toHaveLength(1)
  expect(report.issues[0]!.message).toContain("Keep @voidmix/db/client on the server")
})

test("rejects runtime cycles and dependencies on application composition roots", async () => {
  const root = await fixture()
  await workspace(root, "packages/a", {
    name: "@voidmix/a",
    dependencies: { "@voidmix/b": "workspace:*" },
  })
  await workspace(root, "packages/b", {
    name: "@voidmix/b",
    dependencies: { "@voidmix/a": "workspace:*", "@voidmix/web": "workspace:*" },
  })
  await workspace(root, "apps/web", { name: "@voidmix/web" })
  const messages = (await checkWorkspace(root)).issues.map((issue) => issue.message).join("\n")
  expect(messages).toContain("Runtime dependency cycle")
  expect(messages).toContain("Applications are composition roots")
})

test("requires workspace documentation and workspace protocols", async () => {
  const root = await fixture()
  await workspace(root, "packages/api", { name: "@voidmix/api" })
  await workspace(root, "apps/web", { name: "@voidmix/web", dependencies: { "@voidmix/api": "*" } })
  await rm(join(root, "apps/web/README.md"))
  expect((await checkWorkspace(root)).issues).toHaveLength(2)
})

test("only the API entry point and lifecycle plugins may import its process runtime", async () => {
  const root = await fixture()
  await workspace(
    root,
    "apps/api",
    { name: "@voidmix/api-server" },
    {
      "server.ts": 'import "./src/runtime"',
      "src/plugins/resources.ts": 'import "../runtime"',
      "src/routes/auth.ts": 'import "../runtime"',
      "src/middleware/session.ts": 'import "../runtime.ts"',
      "src/app.ts": 'import "./runtime.js"',
    },
  )
  const report = await checkWorkspace(root)
  expect(report.issues).toHaveLength(3)
  for (const issue of report.issues) expect(issue.message).toContain("inject dependencies")
})
