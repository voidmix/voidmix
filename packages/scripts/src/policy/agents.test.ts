import { describe, expect, it } from "vite-plus/test";

import { maximumAgentsLines, validateWorkspaceAgents } from "./agents.js";

const complete = [
  "# @voidmix/example",
  "",
  "## Purpose",
  "",
  "Why it exists.",
  "",
  "## Interface",
  "",
  "What callers import.",
  "",
  "## Ownership",
  "",
  "What it owns.",
  "",
  "## Constraints",
  "",
  "What it may not do.",
  "",
  "## Verification",
  "",
  "How to check it.",
  "",
].join("\n");

describe("validateWorkspaceAgents", () => {
  it("accepts a complete file", () => {
    expect(validateWorkspaceAgents("packages/example/AGENTS.md", complete)).toEqual([]);
  });

  it("reports a missing section with actionable guidance", () => {
    const withoutOwnership = complete.replace("## Ownership\n\nWhat it owns.\n\n", "");
    const findings = validateWorkspaceAgents("packages/example/AGENTS.md", withoutOwnership);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "agents.workspace",
      location: "packages/example/AGENTS.md",
      message: "missing ## Ownership",
      severity: "error",
    });
    expect(findings[0]?.fix).toContain("## Ownership");
  });

  it("reports an empty section", () => {
    const emptyPurpose = complete.replace("Why it exists.", "");
    const findings = validateWorkspaceAgents("packages/example/AGENTS.md", emptyPurpose);

    expect(findings.map((finding) => finding.message)).toEqual(["## Purpose is empty"]);
  });

  it("reports sections that are present but out of order", () => {
    const swapped = [
      "## Interface",
      "",
      "What callers import.",
      "",
      "## Purpose",
      "",
      "Why it exists.",
      "",
      "## Ownership",
      "",
      "What it owns.",
      "",
      "## Constraints",
      "",
      "What it may not do.",
      "",
      "## Verification",
      "",
      "How to check it.",
    ].join("\n");
    const findings = validateWorkspaceAgents("packages/example/AGENTS.md", swapped);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe(
      "sections are out of order: Interface, Purpose, Ownership, Constraints, Verification",
    );
  });

  it("reports a file over the line cap", () => {
    const padded = `${complete}${"\nfiller".repeat(maximumAgentsLines)}`;
    const findings = validateWorkspaceAgents("packages/example/AGENTS.md", padded);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toMatch(/^has \d+ lines$/);
    expect(findings[0]?.fix).toContain(String(maximumAgentsLines));
  });

  it("does not report order when a section is already missing", () => {
    const findings = validateWorkspaceAgents("packages/example/AGENTS.md", "## Purpose\n\nOnly.\n");

    expect(findings.map((finding) => finding.message)).toEqual([
      "missing ## Interface",
      "missing ## Ownership",
      "missing ## Constraints",
      "missing ## Verification",
    ]);
  });
});
