import { readFile } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import { preProcessFile } from "typescript"

interface Manifest {
  name: string
  workspaces?: string[]
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  exports?: Record<string, unknown>
  overrides?: unknown
}

interface Workspace {
  directory: string
  manifest: Manifest
}

interface Issue {
  file: string
  message: string
}

const portable = (path: string) => path.split(sep).join("/")
const packageName = (specifier: string) =>
  specifier
    .split("/")
    .slice(0, specifier.startsWith("@") ? 2 : 1)
    .join("/")

function hasExport(manifest: Manifest, specifier: string) {
  const subpath = specifier.slice(manifest.name.length)
  const key = subpath ? `.${subpath}` : "."
  return Object.keys(manifest.exports ?? {}).some((pattern) => {
    const [prefix, suffix] = pattern.split("*")
    return suffix === undefined ? pattern === key : key.startsWith(prefix!) && key.endsWith(suffix)
  })
}

function isBrowserSource(directory: string, file: string) {
  if (directory === "packages/ui" || directory === "packages/api") return true
  if (directory === "packages/auth") return ["src/client.ts", "src/device.ts"].includes(file)
  if (directory === "apps/mobile" || directory === "apps/desktop") return file.startsWith("src/")
  return (
    directory === "apps/web" &&
    file.startsWith("src/") &&
    !file.startsWith("src/server/") &&
    !file.startsWith("src/routes/api/")
  )
}

/** Check actual manifests and imports, without starting infrastructure or reading .env. */
export async function checkWorkspace(root: string) {
  const rootManifest = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as Manifest
  const workspaces: Workspace[] = []
  for (const pattern of rootManifest.workspaces ?? []) {
    for await (const file of new Bun.Glob(`${pattern}/package.json`).scan(root)) {
      workspaces.push({
        directory: portable(dirname(file)),
        manifest: JSON.parse(await readFile(join(root, file), "utf8")) as Manifest,
      })
    }
  }
  workspaces.sort((a, b) => a.directory.localeCompare(b.directory))
  const byName = new Map(workspaces.map((workspace) => [workspace.manifest.name, workspace]))
  const issues: Issue[] = []
  let sourceCount = 0
  const issue = (file: string, message: string) => issues.push({ file, message })
  if (byName.size !== workspaces.length) issue("package.json", "Workspace names must be unique.")
  if (rootManifest.overrides)
    issue("package.json", "Use resolutions; Bun ignores them when overrides is present.")

  for (const { directory, manifest } of workspaces) {
    const manifestPath = `${directory}/package.json`
    if (!(await Bun.file(join(root, directory, "README.md")).exists())) {
      issue(manifestPath, "Add a README describing this workspace's responsibility and commands.")
    }
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    }
    for (const [name, version] of Object.entries(dependencies)) {
      const dependency = byName.get(name)
      if (name.startsWith("@voidmix/") && !dependency)
        issue(manifestPath, `Unknown workspace ${name}.`)
      if (!dependency) continue
      if (version !== "workspace:*") issue(manifestPath, `Use workspace:* for ${name}.`)
      if (dependency.directory.startsWith("apps/") && !directory.startsWith("tests/")) {
        issue(manifestPath, `Applications are composition roots; do not depend on ${name}.`)
      }
    }

    const files = new Set<string>()
    for (const pattern of [
      "*.{ts,tsx,js,jsx,mjs,cjs}",
      "{src,scripts,tests}/**/*.{ts,tsx,js,jsx,mjs,cjs}",
    ]) {
      for await (const file of new Bun.Glob(pattern).scan(join(root, directory))) {
        if (!/(?:routeTree|mygo)\.gen\.ts$/.test(file)) files.add(portable(file))
      }
    }
    for (const file of [...files].sort()) {
      sourceCount++
      const sourcePath = `${directory}/${file}`
      const source = await readFile(join(root, sourcePath), "utf8")
      const isTest = file.startsWith("tests/") || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
      for (const imported of preProcessFile(source, true, true).importedFiles) {
        const specifier = imported.fileName.split("?")[0]!
        if (
          specifier.startsWith("node:") ||
          specifier.startsWith("bun:") ||
          specifier.startsWith("@/")
        )
          continue
        if (specifier.startsWith(".")) {
          const target = portable(
            relative(join(root, directory), resolve(root, dirname(sourcePath), specifier)),
          )
          // Integration tests may exercise an application's real adapter; production code uses exports.
          if ((target === ".." || target.startsWith("../")) && !isTest) {
            issue(sourcePath, `Import ${specifier} through its workspace's public exports.`)
          }
          continue
        }
        const name = packageName(specifier)
        if (!dependencies[name] && name !== manifest.name)
          issue(sourcePath, `Declare ${name} in this workspace's package.json.`)
        const dependency = byName.get(name)
        if (dependency && !hasExport(dependency.manifest, specifier))
          issue(sourcePath, `${specifier} is not a public export.`)
        if (
          !isTest &&
          isBrowserSource(directory, file) &&
          (["@voidmix/db", "@voidmix/cache", "@voidmix/storage", "@voidmix/logger"].includes(
            name,
          ) ||
            specifier === "@voidmix/auth/server")
        )
          issue(
            sourcePath,
            `Keep ${specifier} on the server; use the HTTP contract from browser code.`,
          )
      }
    }
  }

  // Only runtime edges participate: test/tool dependencies need not be shipped to callers.
  const visited = new Set<string>()
  const visit = (name: string, chain: string[]) => {
    if (chain.includes(name)) {
      issue(
        byName.get(name)!.directory + "/package.json",
        `Runtime dependency cycle: ${[...chain, name].join(" -> ")}.`,
      )
      return
    }
    if (visited.has(name)) return
    visited.add(name)
    for (const dependency of Object.keys(byName.get(name)!.manifest.dependencies ?? {})) {
      if (byName.has(dependency)) visit(dependency, [...chain, name])
    }
  }
  for (const name of byName.keys()) visit(name, [])
  return { ok: issues.length === 0, workspaceCount: workspaces.length, sourceCount, issues }
}
