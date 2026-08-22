import { describe, expect, it } from "vite-plus/test";

import { parseSkillsLock, validateVendoredSkills } from "./skills.js";

function links(entries: Record<string, string | null>): Map<string, string | null> {
  return new Map(Object.entries(entries));
}

function wired(name: string): Record<string, string | null> {
  return {
    [`.claude/skills/${name}`]: `../../.agents/skills/${name}`,
    [`skills/${name}`]: `../.agents/skills/${name}`,
  };
}

describe("parseSkillsLock", () => {
  it("returns locked skill names in a stable order", () => {
    const lock = JSON.stringify({
      version: 1,
      skills: { shadcn: { source: "shadcn/ui" }, hono: { source: "yusukebe/hono-skill" } },
    });

    expect(parseSkillsLock(lock)).toEqual(["hono", "shadcn"]);
  });

  it("treats a lockfile with no skills as empty", () => {
    expect(parseSkillsLock('{"version":1}')).toEqual([]);
  });
});

describe("validateVendoredSkills", () => {
  it("accepts a skill that is locked, installed, and linked from both roots", () => {
    expect(validateVendoredSkills(["hono"], ["hono"], links(wired("hono")))).toEqual([]);
  });

  it("reports a locked skill that is not installed", () => {
    const findings = validateVendoredSkills(["hono"], [], links({}));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "skills.vendored",
      location: ".agents/skills/hono",
      message: "locked skill is not installed",
      fix: "run: bun run skills:update",
    });
  });

  it("reports a missing discovery symlink per root", () => {
    const findings = validateVendoredSkills(["hono"], ["hono"], links({}));

    expect(findings.map((finding) => finding.location)).toEqual([
      ".claude/skills/hono",
      "skills/hono",
    ]);
    expect(findings[0]?.message).toBe("is missing or is not a symlink");
  });

  it("rejects an absolute symlink target even though it resolves locally", () => {
    const findings = validateVendoredSkills(
      ["hono"],
      ["hono"],
      links({ ...wired("hono"), ".claude/skills/hono": "/Users/someone/repo/.agents/skills/hono" }),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe(
      "points at /Users/someone/repo/.agents/skills/hono instead of ../../.agents/skills/hono",
    );
    expect(findings[0]?.fix).toContain("ln -s ../../.agents/skills/hono");
  });

  it("reports a skill installed without a lockfile entry", () => {
    const findings = validateVendoredSkills([], ["rogue"], links({}));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      location: ".agents/skills/rogue",
      message: "is installed but absent from skills-lock.json",
    });
  });

  it("does not confuse two skills whose names share a prefix", () => {
    const locked = ["tanstack-router-best-practices", "tanstack-start-best-practices"];
    const targets = links({ ...wired(locked[0]!), ...wired(locked[1]!) });

    expect(validateVendoredSkills(locked, locked, targets)).toEqual([]);
  });
});
