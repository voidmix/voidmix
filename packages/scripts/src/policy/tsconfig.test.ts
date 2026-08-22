import { describe, expect, it } from "vite-plus/test";

import {
  fixWorkspaceTypeScriptConfig,
  isPresetFile,
  validateWorkspaceTypeScriptConfig,
} from "./tsconfig.js";

const presets = new Map([
  [
    "packages/tsconfig/base.json",
    JSON.stringify({ compilerOptions: { strict: true, noEmit: true, types: [] } }),
  ],
  [
    "packages/tsconfig/node.json",
    JSON.stringify({
      extends: "./base.json",
      compilerOptions: { module: "NodeNext", types: ["node"] },
    }),
  ],
  [
    "packages/tsconfig/browser.json",
    JSON.stringify({
      extends: "./base.json",
      compilerOptions: { allowImportingTsExtensions: true },
    }),
  ],
]);

const location = "packages/example/tsconfig.json";

function config(body: Record<string, unknown>): string {
  return JSON.stringify(body);
}

describe("validateWorkspaceTypeScriptConfig", () => {
  it("accepts a consumer that only adds what the preset does not provide", () => {
    const content = config({
      extends: "@voidmix/tsconfig/node.json",
      include: ["src/**/*.ts"],
    });

    expect(validateWorkspaceTypeScriptConfig(location, content, presets)).toEqual([]);
  });

  it("reports a config that inherits nothing", () => {
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ compilerOptions: { strict: true } }),
      presets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "tsconfig.preset",
      location,
      message: "declares no extends, so it inherits none of the shared compiler options",
      severity: "error",
    });
  });

  it("reports a list of bases rather than a single preset", () => {
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ extends: ["@voidmix/tsconfig/node.json", "./local.json"] }),
      presets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe("extends a list rather than a single preset");
  });

  it("reports a base outside the shared presets", () => {
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ extends: "../../tsconfig.base.json" }),
      presets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("instead of a shared preset");
  });

  it("reports a preset name that does not exist", () => {
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ extends: "@voidmix/tsconfig/nodejs.json" }),
      presets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("which is not a preset packages/tsconfig exports");
  });

  it("reports a direct preset whose parent is missing", () => {
    const brokenPresets = new Map([
      ["packages/tsconfig/broken.json", JSON.stringify({ extends: "./missing.json" })],
    ]);
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ extends: "@voidmix/tsconfig/broken.json" }),
      brokenPresets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("preset chain is invalid");
  });

  it("reports a missing preset in the middle of a longer chain", () => {
    const brokenPresets = new Map([
      ["packages/tsconfig/top.json", JSON.stringify({ extends: "./middle.json" })],
      ["packages/tsconfig/middle.json", JSON.stringify({ extends: "./missing.json" })],
    ]);
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ extends: "@voidmix/tsconfig/top.json" }),
      brokenPresets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("preset chain is invalid");
  });

  it("reports a preset inheritance cycle", () => {
    const brokenPresets = new Map([
      ["packages/tsconfig/one.json", JSON.stringify({ extends: "./two.json" })],
      ["packages/tsconfig/two.json", JSON.stringify({ extends: "./one.json" })],
    ]);
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ extends: "@voidmix/tsconfig/one.json" }),
      brokenPresets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("preset chain is invalid");
  });

  it("reports a preset whose JSON cannot be parsed", () => {
    const brokenPresets = new Map([["packages/tsconfig/broken.json", "{ not json"]]);
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ extends: "@voidmix/tsconfig/broken.json" }),
      brokenPresets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("preset chain is invalid");
  });

  it("reports a value the immediate preset already sets", () => {
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({
        extends: "@voidmix/tsconfig/browser.json",
        compilerOptions: { allowImportingTsExtensions: true },
      }),
      presets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "tsconfig.redundant",
      location,
      message:
        "restates allowImportingTsExtensions, which packages/tsconfig/browser.json already sets to the same value",
    });
    expect(findings[0]?.fix).toContain("delete allowImportingTsExtensions");
  });

  it("reports a value inherited two levels up, naming the file that sets it", () => {
    const findings = validateWorkspaceTypeScriptConfig(
      location,
      config({ extends: "@voidmix/tsconfig/node.json", compilerOptions: { noEmit: true } }),
      presets,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("packages/tsconfig/base.json already sets");
  });

  it("accepts an override that changes the value, which is why the file exists", () => {
    const content = config({
      extends: "@voidmix/tsconfig/node.json",
      compilerOptions: { types: ["node", "vite/client"] },
    });

    expect(validateWorkspaceTypeScriptConfig(location, content, presets)).toEqual([]);
  });

  it("reports malformed JSON and says comments are not allowed", () => {
    const findings = validateWorkspaceTypeScriptConfig(location, "{ // a comment\n}", presets);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe("is not valid JSON");
    expect(findings[0]?.fix).toContain("no comments");
  });
});

describe("isPresetFile", () => {
  it("accepts a preset and rejects the manifest beside it", () => {
    expect(isPresetFile("packages/tsconfig/base.json")).toBe(true);
    expect(isPresetFile("packages/tsconfig/package.json")).toBe(false);
    expect(isPresetFile("packages/db/tsconfig.json")).toBe(false);
  });
});

describe("fixWorkspaceTypeScriptConfig", () => {
  it("returns a conforming config byte-identical", () => {
    const content = config({ extends: "@voidmix/tsconfig/node.json", include: ["src/**/*.ts"] });

    expect(fixWorkspaceTypeScriptConfig(content, presets)).toBe(content);
  });

  it("deletes the restated options and the emptied compilerOptions with them", () => {
    const content = config({
      extends: "@voidmix/tsconfig/node.json",
      compilerOptions: { noEmit: true, types: ["node"] },
      include: ["src/**/*.ts"],
    });

    const fixed = fixWorkspaceTypeScriptConfig(content, presets);

    expect(JSON.parse(fixed)).toEqual({
      extends: "@voidmix/tsconfig/node.json",
      include: ["src/**/*.ts"],
    });
    expect(validateWorkspaceTypeScriptConfig(location, fixed, presets)).toEqual([]);
  });

  it("keeps an override that changes a value, deleting only the copy beside it", () => {
    const content = config({
      extends: "@voidmix/tsconfig/node.json",
      compilerOptions: { noEmit: true, types: ["node", "vite/client"] },
    });

    expect(JSON.parse(fixWorkspaceTypeScriptConfig(content, presets)).compilerOptions).toEqual({
      types: ["node", "vite/client"],
    });
  });

  it("leaves a config whose preset it cannot resolve, because that is a decision", () => {
    const content = config({
      extends: "../../tsconfig.base.json",
      compilerOptions: { noEmit: true },
    });

    expect(fixWorkspaceTypeScriptConfig(content, presets)).toBe(content);
  });

  it("leaves a config whose preset chain is damaged untouched", () => {
    const brokenPresets = new Map([
      ["packages/tsconfig/broken.json", JSON.stringify({ extends: "./missing.json" })],
    ]);
    const content = config({
      extends: "@voidmix/tsconfig/broken.json",
      compilerOptions: { strict: true },
    });

    expect(fixWorkspaceTypeScriptConfig(content, brokenPresets)).toBe(content);
  });

  it("is idempotent", () => {
    const once = fixWorkspaceTypeScriptConfig(
      config({ extends: "@voidmix/tsconfig/node.json", compilerOptions: { noEmit: true } }),
      presets,
    );

    expect(fixWorkspaceTypeScriptConfig(once, presets)).toBe(once);
  });
});
