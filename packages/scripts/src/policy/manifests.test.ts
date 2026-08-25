import { describe, expect, it } from "vite-plus/test";

import {
  canonicalScripts,
  deriveWorkspaceShape,
  fixWorkspaceManifest,
  validateWorkspaceManifest,
  type WorkspaceShape,
} from "./manifests.js";
import { validateTestWiring } from "./manifests/wiring.js";

const location = "packages/example/package.json";

const checkCommand = "tsc --noEmit -p tsconfig.json";

function shape(overrides: Partial<WorkspaceShape> = {}): WorkspaceShape {
  return {
    hasVitestConfig: true,
    hasTestFiles: true,
    typeScriptConfigs: ["tsconfig.json"],
    ...overrides,
  };
}

/**
 * Serializes a manifest. `scripts` is replaced wholesale rather than merged so a
 * case can omit one: `exactOptionalPropertyTypes` rejects an undefined value.
 */
function manifest(
  overrides: {
    dependencies?: unknown;
    devDependencies?: unknown;
    devEngines?: unknown;
    omitScripts?: boolean;
    peerDependencies?: unknown;
    scripts?: unknown;
  } = {},
): string {
  const { omitScripts, scripts, ...manifestFields } = overrides;
  return JSON.stringify({
    name: "@voidmix/example",
    private: true,
    ...manifestFields,
    ...(omitScripts
      ? {}
      : {
          scripts:
            scripts === undefined
              ? {
                  ...canonicalScripts,
                  check: checkCommand,
                  build: checkCommand,
                }
              : scripts,
        }),
  });
}

describe("deriveWorkspaceShape", () => {
  it("reads the runner, the tests, and every root TypeScript project", () => {
    expect(
      deriveWorkspaceShape("apps/desktop", [
        "apps/desktop/package.json",
        "apps/desktop/tsconfig.json",
        "apps/desktop/tsconfig.node.json",
        "apps/desktop/vitest.config.ts",
        "apps/desktop/src/app.test.ts",
        "apps/web/tsconfig.json",
      ]),
    ).toEqual({
      hasVitestConfig: true,
      hasTestFiles: true,
      typeScriptConfigs: ["tsconfig.json", "tsconfig.node.json"],
    });
  });

  it("ignores a nested config, which belongs to a fixture rather than the workspace", () => {
    expect(
      deriveWorkspaceShape("packages/db", [
        "packages/db/package.json",
        "packages/db/src/vitest.config.ts",
        "packages/db/src/fixtures/tsconfig.json",
      ]),
    ).toEqual({ hasVitestConfig: false, hasTestFiles: false, typeScriptConfigs: [] });
  });
});

describe("validateWorkspaceManifest", () => {
  it("accepts a manifest that matches the contract", () => {
    expect(validateWorkspaceManifest(location, manifest(), shape())).toEqual([]);
  });

  for (const name of Object.keys(canonicalScripts)) {
    it(`reports ${name} when it deviates, quoting the command to paste`, () => {
      const scripts: Record<string, string> = {
        ...canonicalScripts,
        check: checkCommand,
        build: checkCommand,
      };
      scripts[name] = "vp test --run --silent";
      const findings = validateWorkspaceManifest(location, manifest({ scripts }), shape());

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        check: "manifest.scripts",
        location,
        message: `${name} does not match the repository-wide command`,
        severity: "error",
      });
      expect(findings[0]?.fix).toContain(canonicalScripts[name] ?? "");
    });
  }

  it("reports a canonical script the workspace never declares", () => {
    const { "test:component": _omitted, ...rest } = canonicalScripts;
    const findings = validateWorkspaceManifest(
      location,
      manifest({ scripts: { ...rest, check: checkCommand, build: checkCommand } }),
      shape(),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("does not declare test:component");
  });

  it("reports test scripts declared without a runner to run them", () => {
    const findings = validateWorkspaceManifest(
      location,
      manifest({ scripts: { ...canonicalScripts, check: checkCommand } }),
      shape({ hasVitestConfig: false }),
    );

    expect(findings).toHaveLength(Object.keys(canonicalScripts).length);
    expect(findings[0]).toMatchObject({ check: "manifest.scripts" });
    expect(findings[0]?.message).toContain("without a vitest.config.ts");
  });

  it("expects no test scripts when the workspace owns no runner", () => {
    expect(
      validateWorkspaceManifest(
        location,
        manifest({ scripts: { check: checkCommand } }),
        shape({ hasVitestConfig: false }),
      ),
    ).toEqual([]);
  });

  it("reports a TypeScript project that check never reaches", () => {
    const findings = validateWorkspaceManifest(
      location,
      manifest(),
      shape({ typeScriptConfigs: ["tsconfig.json", "tsconfig.node.json"] }),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("check does not type-check tsconfig.node.json");
  });

  it("follows bun run references, so a composed check counts as covering both", () => {
    const scripts = {
      ...canonicalScripts,
      check: "bun run typecheck && bun run typecheck:node",
      typecheck: checkCommand,
      "typecheck:node": "tsc --noEmit -p tsconfig.node.json",
      build: "bun run check && vmx env -- vp build",
    };

    expect(
      validateWorkspaceManifest(
        location,
        manifest({ scripts }),
        shape({ typeScriptConfigs: ["tsconfig.json", "tsconfig.node.json"] }),
      ),
    ).toEqual([]);
  });

  it("reports a build that can ship an unchecked tree", () => {
    const scripts = { ...canonicalScripts, check: checkCommand, build: "vp build" };
    const findings = validateWorkspaceManifest(location, manifest({ scripts }), shape());

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("build does not run check first");
    expect(findings[0]?.fix).toContain("bun run check &&");
  });

  it("reports a workspace that owns a project but declares no check", () => {
    const findings = validateWorkspaceManifest(
      location,
      manifest({ scripts: { ...canonicalScripts } }),
      shape(),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("declares no check script");
  });

  it("reports a third-party dependency pinned outside the catalog", () => {
    const findings = validateWorkspaceManifest(
      location,
      manifest({ dependencies: { zod: "4.4.3" } }),
      shape(),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ check: "manifest.dependencies", location });
    expect(findings[0]?.message).toContain("dependencies pins zod to 4.4.3");
  });

  it("reports an internal dependency that bypasses the workspace protocol", () => {
    const findings = validateWorkspaceManifest(
      location,
      manifest({ devDependencies: { "@voidmix/tsconfig": "^0.0.0" } }),
      shape(),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("devDependencies pins @voidmix/tsconfig");
    expect(findings[0]?.fix).toContain("workspace:*");
  });

  for (const value of [42, ["catalog:"], null]) {
    it(`reports a non-string dependency value (${String(value)}) without throwing`, () => {
      const findings = validateWorkspaceManifest(
        location,
        manifest({ dependencies: { zod: value } }),
        shape(),
      );

      expect(findings).toEqual([
        {
          check: "manifest.structure",
          location,
          message: "dependencies must be an object whose values are strings",
          fix: `repair dependencies in ${location}; use an object with string values`,
          severity: "error",
        },
      ]);
    });
  }

  it("reports an invalid scripts field without throwing", () => {
    const content = manifest({ scripts: ["vp test --run"] });

    expect(validateWorkspaceManifest(location, content, shape())).toEqual([
      {
        check: "manifest.structure",
        location,
        message: "scripts must be an object whose values are strings",
        fix: `repair scripts in ${location}; use an object with string values`,
        severity: "error",
      },
    ]);
  });

  it("leaves peerDependencies alone, where a range is the point", () => {
    expect(
      validateWorkspaceManifest(
        location,
        manifest({ peerDependencies: { react: "^19.2.0" } }),
        shape(),
      ),
    ).toEqual([]);
  });

  it("reports a workspace that restates the root toolchain", () => {
    const findings = validateWorkspaceManifest(
      location,
      manifest({ devEngines: { packageManager: { name: "bun" } } }),
      shape(),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "manifest.engines",
      message: "declares its own devEngines",
    });
  });

  it("reports malformed JSON once rather than throwing past the other rules", () => {
    const findings = validateWorkspaceManifest(location, "{ not json", shape());

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe("is not valid JSON");
    expect(findings[0]?.fix).toContain("without comments");
  });
});

describe("fixWorkspaceManifest", () => {
  // The fixture is compact rather than 2-space indented on purpose: a manifest
  // with no finding against it must come back untouched whatever its formatting,
  // because reformatting is Oxfmt's job and not this command's.
  it("returns a conforming manifest byte-identical, whatever its formatting", () => {
    const content = manifest();

    expect(fixWorkspaceManifest(content, shape())).toBe(content);
  });

  it("rewrites every deviating script, adds a missing one, and drops devEngines", () => {
    const { "test:component": _omitted, ...rest } = canonicalScripts;
    const content = manifest({
      devEngines: { runtime: { name: "node" } },
      scripts: { ...rest, "test:unit": "vp test --run", check: checkCommand, build: checkCommand },
    });

    const fixed = fixWorkspaceManifest(content, shape());

    expect(validateWorkspaceManifest(location, fixed, shape())).toEqual([]);
    expect(JSON.parse(fixed)).toMatchObject({ scripts: canonicalScripts });
    expect(fixed).not.toContain("devEngines");
  });

  it("prefixes a build that would ship an unchecked tree", () => {
    const scripts = { ...canonicalScripts, check: checkCommand, build: "vp build" };
    const fixed = fixWorkspaceManifest(manifest({ scripts }), shape());

    expect(JSON.parse(fixed).scripts.build).toBe(`bun run check && vp build`);
    expect(validateWorkspaceManifest(location, fixed, shape())).toEqual([]);
  });

  it("leaves a dependency alone, because which catalog it belongs in is a decision", () => {
    const content = manifest({ dependencies: { zod: "4.4.3" } });

    expect(fixWorkspaceManifest(content, shape())).toBe(content);
  });

  it("leaves a stray test script alone when the runner is what may be missing", () => {
    const content = manifest({ scripts: { ...canonicalScripts, check: checkCommand } });

    expect(fixWorkspaceManifest(content, shape({ hasVitestConfig: false }))).toBe(content);
  });

  it("creates canonical scripts when a vitest workspace has no scripts field", () => {
    const content = manifest({ omitScripts: true });
    const fixed = fixWorkspaceManifest(content, shape({ typeScriptConfigs: [] }));

    expect(JSON.parse(fixed).scripts).toEqual(canonicalScripts);
    expect(validateWorkspaceManifest(location, fixed, shape({ typeScriptConfigs: [] }))).toEqual(
      [],
    );
    expect(fixWorkspaceManifest(fixed, shape({ typeScriptConfigs: [] }))).toBe(fixed);
  });

  it("leaves an invalid scripts field untouched", () => {
    const content = manifest({
      scripts: ["vp test --run"],
      devEngines: { runtime: { name: "node" } },
    });
    const fixed = fixWorkspaceManifest(content, shape());

    expect(JSON.parse(fixed).scripts).toEqual(["vp test --run"]);
    expect(JSON.parse(fixed)).not.toHaveProperty("devEngines");
    expect(validateWorkspaceManifest(location, fixed, shape())).toEqual([
      expect.objectContaining({
        check: "manifest.structure",
        message: "scripts must be an object whose values are strings",
      }),
    ]);
  });

  it("leaves malformed JSON untouched rather than guessing at it", () => {
    expect(fixWorkspaceManifest("{ not json", shape())).toBe("{ not json");
  });

  it("is idempotent", () => {
    const scripts = { ...canonicalScripts, "test:unit": "vp test --run", check: checkCommand };
    const once = fixWorkspaceManifest(manifest({ scripts }), shape());

    expect(fixWorkspaceManifest(once, shape())).toBe(once);
  });
});

describe("validateTestWiring", () => {
  const config = "apps/web/vitest.config.ts";

  it("warns when a runner is configured and no test exists", () => {
    const findings = validateTestWiring(config, shape({ hasTestFiles: false }));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "tests.wiring",
      location: config,
      severity: "warn",
    });
    expect(findings[0]?.fix).toContain("apps/web/src");
  });

  it("stays quiet when tests exist", () => {
    expect(validateTestWiring(config, shape())).toEqual([]);
  });

  it("stays quiet when the workspace owns no runner", () => {
    expect(
      validateTestWiring(config, shape({ hasVitestConfig: false, hasTestFiles: false })),
    ).toEqual([]);
  });
});
