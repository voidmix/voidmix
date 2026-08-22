import type { PolicyFinding } from "./checks.js";

/** Where the shared presets live, relative to the repository root. */
export const presetRoot = "packages/tsconfig";

/**
 * True when a repository-relative file is one of the shared preset documents.
 * Which files those are is read from the directory rather than listed, so adding
 * a sixth preset needs no change here.
 */
export function isPresetFile(file: string): boolean {
  return (
    file.startsWith(`${presetRoot}/`) &&
    file.endsWith(".json") &&
    file !== `${presetRoot}/package.json`
  );
}

/** The specifier prefix a workspace uses to reach them. */
export const presetSpecifier = "@voidmix/tsconfig/";

/** A workspace does not inherit from the shared presets. */
function presetFinding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "tsconfig.preset", location, message, fix, severity: "error" };
}

/** A workspace restates a value it already inherits. */
function redundantFinding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "tsconfig.redundant", location, message, fix, severity: "error" };
}

interface TypeScriptConfig {
  compilerOptions?: Record<string, unknown>;
  extends?: unknown;
}

function isConfigObject(value: unknown): value is TypeScriptConfig {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface InheritedOption {
  /** Repository-relative preset that last set the value. */
  source: string;
  value: unknown;
}

/** Resolves the `@voidmix/tsconfig/` specifier a workspace uses. */
function resolveConsumerPreset(specifier: unknown): string | null {
  if (typeof specifier !== "string" || !specifier.startsWith(presetSpecifier)) return null;
  return `${presetRoot}/${specifier.slice(presetSpecifier.length)}`;
}

/**
 * Resolves the `./` specifier the presets use between themselves. String
 * operations only, so this module stays pure.
 */
function resolveSiblingPreset(specifier: string, from: string): string | null {
  if (!specifier.startsWith("./")) return null;
  return `${from.slice(0, from.lastIndexOf("/"))}/${specifier.slice(2)}`;
}

/**
 * The options a config restates: present locally, and already provided with the
 * same value by the chain. Read by both the validator and the fixer so one can
 * never act on a key the other passed over.
 */
function redundantOptions(
  config: TypeScriptConfig,
  inherited: ReadonlyMap<string, InheritedOption>,
): [string, InheritedOption][] {
  const restated: [string, InheritedOption][] = [];
  for (const [key, value] of Object.entries(config.compilerOptions ?? {})) {
    const provided = inherited.get(key);
    // JSON comparison is order-sensitive on arrays, which can only under-report:
    // a reordered `lib` reads as a deliberate override rather than a copy.
    if (provided === undefined || JSON.stringify(provided.value) !== JSON.stringify(value))
      continue;
    restated.push([key, provided]);
  }
  return restated;
}

/**
 * Collects the compiler options a preset provides, following its own `extends`
 * chain so a value set two levels up still counts as inherited. Nearer presets
 * win, and each entry records which file to name in the finding. Returns null
 * when the chain reaches a file the caller did not supply.
 */
function resolveInherited(
  path: string,
  presets: ReadonlyMap<string, string>,
  seen: Set<string> = new Set(),
): Map<string, InheritedOption> | null {
  if (seen.has(path)) return null;
  seen.add(path);

  const content = presets.get(path);
  if (content === undefined) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!isConfigObject(parsed)) return null;

  let inherited = new Map<string, InheritedOption>();
  if (parsed.extends !== undefined) {
    if (typeof parsed.extends !== "string") return null;
    const parent = resolveSiblingPreset(parsed.extends, path);
    if (parent === null) return null;
    const resolved = resolveInherited(parent, presets, seen);
    if (resolved === null) return null;
    inherited = resolved;
  }

  for (const [key, value] of Object.entries(parsed.compilerOptions ?? {})) {
    inherited.set(key, { source: path, value });
  }
  return inherited;
}

/**
 * Validates one workspace TypeScript config: it must extend a preset that exists,
 * and it must not restate a value the resolved chain already provides.
 *
 * A restated value is silently correct until the preset changes, at which point
 * one workspace quietly keeps the old behaviour — the same failure as any
 * unchecked copy. Overrides with a different value are left alone, because
 * narrowing `types` or widening `lib` is why a workspace file exists at all.
 *
 * Expected values are read from the preset files rather than encoded here, so
 * this check cannot disagree with the presets. Pure.
 *
 * @param location repository-relative path, e.g. `apps/desktop/tsconfig.node.json`
 * @param presets raw JSON text keyed by repository-relative preset path
 */
export function validateWorkspaceTypeScriptConfig(
  location: string,
  content: string,
  presets: ReadonlyMap<string, string>,
): PolicyFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [
      presetFinding(
        location,
        "is not valid JSON",
        `repair ${location}; policy parses it as strict JSON, so it must carry no comments`,
      ),
    ];
  }
  if (!isConfigObject(parsed)) {
    return [
      presetFinding(
        location,
        "is not a JSON object",
        `repair ${location}; the TypeScript config must be a JSON object`,
      ),
    ];
  }
  const config = parsed;

  if (typeof config.extends !== "string") {
    return [
      presetFinding(
        location,
        config.extends === undefined
          ? "declares no extends, so it inherits none of the shared compiler options"
          : "extends a list rather than a single preset",
        `set extends in ${location} to a ${presetSpecifier}*.json preset`,
      ),
    ];
  }

  if (!config.extends.startsWith(presetSpecifier)) {
    return [
      presetFinding(
        location,
        `extends ${config.extends} instead of a shared preset`,
        `set extends in ${location} to a ${presetSpecifier}*.json preset`,
      ),
    ];
  }

  const path = resolveConsumerPreset(config.extends);
  const inherited = path === null ? null : resolveInherited(path, presets);
  if (inherited === null) {
    const chainIsBroken = path !== null && presets.has(path);
    return [
      presetFinding(
        location,
        chainIsBroken
          ? `extends ${config.extends}, but its preset chain is invalid`
          : `extends ${config.extends}, which is not a preset ${presetRoot} exports`,
        chainIsBroken
          ? `repair the preset chain rooted at ${path} under ${presetRoot}`
          : `point extends in ${location} at an existing preset under ${presetRoot}`,
      ),
    ];
  }

  const findings: PolicyFinding[] = [];
  for (const [key, provided] of redundantOptions(config, inherited)) {
    findings.push(
      redundantFinding(
        location,
        `restates ${key}, which ${provided.source} already sets to the same value`,
        `delete ${key} from the compilerOptions in ${location}`,
      ),
    );
  }
  return findings;
}

/**
 * Rewrites a workspace TypeScript config by deleting the options it restates,
 * dropping an emptied `compilerOptions` with them. A config whose `extends` is
 * missing, unresolvable, or outside the presets is left untouched: which preset it
 * should name is a decision, not a transformation.
 *
 * Returns the input unchanged when nothing applies. Pure.
 */
export function fixWorkspaceTypeScriptConfig(
  content: string,
  presets: ReadonlyMap<string, string>,
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return content;
  }
  if (!isConfigObject(parsed)) return content;
  const config = parsed;

  const path = resolveConsumerPreset(config.extends);
  const inherited = path === null ? null : resolveInherited(path, presets);
  if (inherited === null) return content;

  const redundant = redundantOptions(config, inherited);
  if (redundant.length === 0) return content;

  for (const [key] of redundant) delete config.compilerOptions?.[key];
  if (Object.keys(config.compilerOptions ?? {}).length === 0) delete config.compilerOptions;

  return `${JSON.stringify(config, null, 2)}\n`;
}
