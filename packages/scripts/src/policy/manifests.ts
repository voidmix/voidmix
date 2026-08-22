import type { PolicyFinding } from "./checks.js";
import {
  canonicalScripts,
  engineFinding,
  expandScript,
  scriptFinding,
  structureFinding,
  validateDependencies,
  validateScripts,
} from "./manifests/rules.js";

export { canonicalScripts } from "./manifests/rules.js";

/**
 * What policy observes about a workspace rather than configures.
 *
 * These facts replace a hand-maintained exemption list. `packages/tsconfig` owns
 * no TypeScript project and no test runner, so the script rules are vacuous for
 * it without naming it — and a list of names is itself the kind of unchecked
 * copy this checker exists to remove.
 */
export interface WorkspaceShape {
  /** True when the workspace root holds a `vitest.config.ts`. */
  hasVitestConfig: boolean;
  /** True when any `*.{test,spec}.{ts,tsx}` file exists anywhere in it. */
  hasTestFiles: boolean;
  /** Workspace-relative `tsconfig*.json` files in the workspace root, sorted. */
  typeScriptConfigs: readonly string[];
}

const testFile = /\.(?:test|spec)\.tsx?$/;
const typeScriptConfig = /^tsconfig(?:\..+)?\.json$/;

/**
 * Derives a workspace's shape from a flat file listing. Kept separate from the
 * rules so the only non-trivial assembly is testable without a filesystem. Pure.
 *
 * @param member repository-relative workspace directory, e.g. `apps/desktop`
 * @param files repository-relative files under the workspace directories
 */
export function deriveWorkspaceShape(member: string, files: readonly string[]): WorkspaceShape {
  const prefix = `${member}/`;
  const owned = files
    .filter((file) => file.startsWith(prefix))
    .map((file) => file.slice(prefix.length));
  // A config nested under src/ belongs to a fixture or a test, not to the
  // workspace, so only the root listing counts.
  const root = owned.filter((file) => !file.includes("/"));

  return {
    hasVitestConfig: root.includes("vitest.config.ts"),
    hasTestFiles: owned.some((file) => testFile.test(file)),
    typeScriptConfigs: root.filter((file) => typeScriptConfig.test(file)).sort(),
  };
}

interface Manifest {
  dependencies?: unknown;
  devDependencies?: unknown;
  devEngines?: unknown;
  peerDependencies?: unknown;
  scripts?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isPlainObject(value) && Object.values(value).every((entry) => typeof entry === "string");
}

/**
 * Validates one workspace `package.json` against the repository contract: the
 * canonical test scripts, a `check` that reaches every TypeScript project the
 * workspace owns, a `build` that cannot ship an unchecked tree, the catalog and
 * workspace version protocols, and no local restatement of the root toolchain.
 *
 * `peerDependencies` is skipped on purpose: a peer declares a range its consumer
 * must satisfy, and `catalog:` is not a range.
 *
 * Parses the text itself so a malformed manifest reports once instead of
 * throwing past the other checks. Pure.
 */
export function validateWorkspaceManifest(
  location: string,
  content: string,
  shape: WorkspaceShape,
): PolicyFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [
      scriptFinding(
        location,
        "is not valid JSON",
        `repair ${location}; package.json must be strict JSON, without comments`,
      ),
    ];
  }

  if (!isPlainObject(parsed)) return [structureFinding(location, "package.json")];
  const manifest = parsed as Manifest;
  const findings: PolicyFinding[] = [];

  if (manifest.scripts === undefined) {
    findings.push(...validateScripts(location, {}, shape));
  } else if (isStringMap(manifest.scripts)) {
    findings.push(...validateScripts(location, manifest.scripts, shape));
  } else {
    findings.push(structureFinding(location, "scripts"));
  }

  for (const [field, value] of [
    ["dependencies", manifest.dependencies],
    ["devDependencies", manifest.devDependencies],
  ] as const) {
    if (value === undefined) continue;
    if (!isStringMap(value)) {
      findings.push(structureFinding(location, field));
      continue;
    }
    findings.push(...validateDependencies(location, field, value));
  }

  if (manifest.devEngines !== undefined) {
    findings.push(
      engineFinding(
        location,
        "declares its own devEngines",
        `remove the devEngines block from ${location}; the root package.json pins Bun and Node for every workspace`,
      ),
    );
  }

  return findings;
}

/** Serializes a manifest the way Oxfmt formats JSON, so `vp fmt` stays quiet. */
function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Rewrites a workspace `package.json` for the findings that have exactly one
 * possible remedy: a canonical test script that deviates or is absent, a `build`
 * that does not run `check` first, and a locally restated `devEngines`.
 *
 * Everything else this module reports needs a decision and is left untouched —
 * which catalog a dependency belongs in, whether a stray test script or the
 * missing runner is the mistake, how a second TypeScript project should be
 * composed into `check`. Applying a guess there would be worse than the finding.
 *
 * Returns the input unchanged when nothing applies, so the caller can compare and
 * skip the write. Pure.
 */
export function fixWorkspaceManifest(content: string, shape: WorkspaceShape): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return content;
  }
  if (!isPlainObject(parsed)) return content;
  const manifest = parsed as Manifest;

  // Tracked rather than inferred by comparing serializations: a conforming
  // manifest that merely indents differently has no finding against it, and
  // reformatting it would be this command doing Oxfmt's job uninvited.
  let changed = false;
  let scripts: Record<string, string> | undefined;
  if (manifest.scripts === undefined && shape.hasVitestConfig) {
    scripts = {};
    manifest.scripts = scripts;
    changed = true;
  } else if (isStringMap(manifest.scripts)) {
    scripts = manifest.scripts;
  }

  if (scripts !== undefined && shape.hasVitestConfig) {
    for (const [name, canonical] of Object.entries(canonicalScripts)) {
      if (scripts[name] === canonical) continue;
      scripts[name] = canonical;
      changed = true;
    }
  }

  if (scripts !== undefined) {
    const check = expandScript(scripts, "check");
    const build = expandScript(scripts, "build");
    if (check !== undefined && build !== undefined && !build.startsWith(check)) {
      scripts.build = `bun run check && ${scripts.build ?? ""}`;
      changed = true;
    }
  }

  if (manifest.devEngines !== undefined) {
    delete manifest.devEngines;
    changed = true;
  }

  return changed ? serialize(manifest) : content;
}
