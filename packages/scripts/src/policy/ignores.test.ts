import { describe, expect, it } from "vite-plus/test";

import { fixWorkspaceIgnore, parseIgnorePatterns, validateWorkspaceIgnore } from "./ignores.js";

const rootPatterns = ["*.log", "node_modules/", "apps/*/coverage/", ".DS_Store"];

const location = "apps/web/.gitignore";

/** The real contents of a workspace ignore file, which must stay clean. */
const anchored = [
  "# TanStack Start build output and dev caches.",
  "/.output",
  "/.nitro",
  "/.storage",
  "/.tanstack",
].join("\n");

describe("parseIgnorePatterns", () => {
  it("drops comments and blank lines and trims each pattern", () => {
    expect(parseIgnorePatterns("# a comment\n\n  /dist  \n\n/.output\n")).toEqual([
      "/dist",
      "/.output",
    ]);
  });

  it("keeps negations, which are patterns too", () => {
    expect(parseIgnorePatterns("/public/*\n!/public/keep.txt\n")).toEqual([
      "/public/*",
      "!/public/keep.txt",
    ]);
  });
});

describe("validateWorkspaceIgnore", () => {
  it("accepts a workspace that anchors every pattern it owns", () => {
    expect(validateWorkspaceIgnore(location, anchored, rootPatterns)).toEqual([]);
  });

  it("reports a bare directory name, which matches at any depth", () => {
    const findings = validateWorkspaceIgnore(location, "dist\n", rootPatterns);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "ignore.anchor",
      location,
      message: "dist is not anchored to the workspace root",
      severity: "error",
    });
    expect(findings[0]?.fix).toContain("/dist");
  });

  it("reports a name whose only slash is trailing", () => {
    const findings = validateWorkspaceIgnore(location, "coverage/\n", rootPatterns);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ check: "ignore.anchor", location });
    expect(findings[0]?.message).toContain("coverage/");
  });

  it("accepts a pattern anchored by an interior slash", () => {
    expect(validateWorkspaceIgnore(location, "gen/schemas\n", rootPatterns)).toEqual([]);
  });

  it("accepts a pattern that names a shape rather than a path", () => {
    expect(validateWorkspaceIgnore(location, "*.tsbuildinfo\n", rootPatterns)).toEqual([]);
  });

  it("accepts an unanchored negation, which re-includes rather than hides", () => {
    expect(validateWorkspaceIgnore(location, "!keep\n", rootPatterns)).toEqual([]);
  });

  it("reports a pattern the root already applies everywhere", () => {
    const findings = validateWorkspaceIgnore(location, "node_modules/\n", rootPatterns);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "ignore.duplicate",
      location,
      message: "repeats node_modules/ from the root .gitignore",
      severity: "error",
    });
    expect(findings[0]?.fix).toContain("the root already applies it everywhere");
  });

  it("reports a duplicate once even when it is also unanchored", () => {
    const findings = validateWorkspaceIgnore(location, ".DS_Store\n", rootPatterns);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ check: "ignore.duplicate" });
  });
});

describe("fixWorkspaceIgnore", () => {
  it("returns a clean file byte-identical, so the caller can skip the write", () => {
    expect(fixWorkspaceIgnore(anchored, rootPatterns)).toBe(anchored);
  });

  it("anchors a bare name and drops a root duplicate, keeping comments and order", () => {
    const content = ["# Build output.", "dist", "*.log", "/keep", ""].join("\n");

    expect(fixWorkspaceIgnore(content, rootPatterns)).toBe(
      ["# Build output.", "/dist", "/keep", ""].join("\n"),
    );
  });

  it("leaves every finding it resolved with nothing left to report", () => {
    const content = ["logs", "coverage/", "node_modules/", ""].join("\n");
    const fixed = fixWorkspaceIgnore(content, rootPatterns);

    expect(validateWorkspaceIgnore(location, fixed, rootPatterns)).toEqual([]);
  });

  it("is idempotent", () => {
    const once = fixWorkspaceIgnore("dist\n*.log\n", rootPatterns);

    expect(fixWorkspaceIgnore(once, rootPatterns)).toBe(once);
  });
});
