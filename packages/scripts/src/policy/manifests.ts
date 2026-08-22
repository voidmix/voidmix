import type { PolicyFinding } from "./checks.js";

/**
 * The test scripts every workspace with a `vitest.config.ts` carries verbatim.
 *
 * This table is the contract and the manifests are its copies, which is only
 * acceptable because this check makes them non-drifting. Each fix string is
 * generated from the same constant, so the remedy is a paste and the message can
 * never disagree with the rule.
 *
 * `test` is deliberately absent: it varies with `--passWithNoTests`, and whether
 * a workspace should carry that flag is what `tests.wiring` is about.
 */
export const canonicalScripts: Readonly<Record<string, string>> = {
  "test:unit":
    "vitest run --passWithNoTests --exclude '**/*.component.test.{ts,tsx}' --exclude '**/*.integration.test.{ts,tsx}'",
  // vitest treats a positional argument as a substring filter, not a glob. A
  // glob here matches nothing and passes anyway via --passWithNoTests, which is
  // how the repository once ran zero integration and component tests.
  "test:integration": "vitest run --passWithNoTests integration.test",
  "test:component": "vitest run --passWithNoTests component.test",
  "test:coverage":
    "vitest run --passWithNoTests --coverage --coverage.reporter=text --coverage.reporter=json --coverage.reporter=lcov",
};

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

/** A workspace script disagrees with the repository-wide contract. */
function scriptFinding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "manifest.scripts", location, message, fix, severity: "error" };
}

/** A dependency bypasses the catalog or the workspace protocol. */
function dependencyFinding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "manifest.dependencies", location, message, fix, severity: "error" };
}

/** A workspace restates toolchain requirements the root owns. */
function engineFinding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "manifest.engines", location, message, fix, severity: "error" };
}

/** A workspace looks tested without being tested. */
function wiringFinding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "tests.wiring", location, message, fix, severity: "warn" };
}

/** A manifest field has a shape policy cannot safely inspect. */
function structureFinding(location: string, field: string): PolicyFinding {
  return {
    check: "manifest.structure",
    location,
    message: `${field} must be an object whose values are strings`,
    fix: `repair ${field} in ${location}; use an object with string values`,
    severity: "error",
  };
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

/**
 * Substitutes `bun run <name>` with the named script so a composed command can
 * be matched as one string. Bounded at three levels; a deeper chain returns
 * unexpanded rather than recursing on a cycle.
 */
function expandScript(
  scripts: Readonly<Record<string, string>>,
  name: string,
  depth = 0,
): string | undefined {
  const command = scripts[name];
  if (command === undefined || depth >= 3) return command;
  return command.replace(
    /bun run ([\w:-]+)/g,
    (match, referenced: string) => expandScript(scripts, referenced, depth + 1) ?? match,
  );
}

function validateScripts(
  location: string,
  scripts: Readonly<Record<string, string>>,
  shape: WorkspaceShape,
): PolicyFinding[] {
  const findings: PolicyFinding[] = [];

  for (const [name, canonical] of Object.entries(canonicalScripts)) {
    const declared = scripts[name];
    if (!shape.hasVitestConfig) {
      if (declared !== undefined) {
        findings.push(
          scriptFinding(
            location,
            `declares ${name} without a vitest.config.ts to run it`,
            `remove ${name} from ${location}, or add a vitest.config.ts to the workspace`,
          ),
        );
      }
      continue;
    }
    if (declared === undefined) {
      findings.push(
        scriptFinding(
          location,
          `does not declare ${name}, so \`vp run -r ${name}\` skips this workspace`,
          `add to ${location}: "${name}": "${canonical}"`,
        ),
      );
      continue;
    }
    if (declared !== canonical) {
      findings.push(
        scriptFinding(
          location,
          `${name} does not match the repository-wide command`,
          `set ${name} in ${location} to: ${canonical}`,
        ),
      );
    }
  }

  const check = expandScript(scripts, "check");
  if (shape.typeScriptConfigs.length > 0 && check === undefined) {
    findings.push(
      scriptFinding(
        location,
        "owns a TypeScript project but declares no check script",
        `add to ${location}: "check": "tsc --noEmit -p ${shape.typeScriptConfigs[0]}"`,
      ),
    );
  }

  if (check !== undefined) {
    for (const config of shape.typeScriptConfigs) {
      if (check.includes(`-p ${config}`)) continue;
      findings.push(
        scriptFinding(
          location,
          `check does not type-check ${config}, so nothing ever does`,
          `extend the check script in ${location} with: tsc --noEmit -p ${config}`,
        ),
      );
    }
  }

  const build = expandScript(scripts, "build");
  if (build !== undefined && check !== undefined && !build.startsWith(check)) {
    findings.push(
      scriptFinding(
        location,
        "build does not run check first, so it can ship an unchecked tree",
        `prefix the build script in ${location} with: bun run check &&`,
      ),
    );
  }

  return findings;
}

function validateDependencies(
  location: string,
  group: string,
  dependencies: Readonly<Record<string, string>>,
): PolicyFinding[] {
  const findings: PolicyFinding[] = [];

  for (const [name, version] of Object.entries(dependencies)) {
    if (name.startsWith("@voidmix/")) {
      if (version === "workspace:*") continue;
      findings.push(
        dependencyFinding(
          location,
          `${group} pins ${name} to ${version} instead of the workspace protocol`,
          `set ${name} in ${location} to: workspace:*`,
        ),
      );
      continue;
    }
    if (version.startsWith("catalog:")) continue;
    findings.push(
      dependencyFinding(
        location,
        `${group} pins ${name} to ${version} instead of a catalog entry`,
        `add ${name} to a root catalog and set it in ${location} to: catalog: or catalog:<name>`,
      ),
    );
  }

  return findings;
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

/**
 * Reports a workspace that ships a test runner and no test. The scripts pass
 * `--passWithNoTests`, so this cannot fail a run — the workspace reads as
 * covered while proving nothing, which is why it warns rather than errors. Pure.
 *
 * @param location the workspace's `vitest.config.ts`
 */
export function validateTestWiring(location: string, shape: WorkspaceShape): PolicyFinding[] {
  if (!shape.hasVitestConfig || shape.hasTestFiles) return [];
  return [
    wiringFinding(
      location,
      "has a vitest.config.ts and no test file, so its test scripts prove nothing",
      `add a test under ${location.replace(/\/[^/]+$/, "/src")}, or remove the vitest.config.ts and its test scripts`,
    ),
  ];
}
