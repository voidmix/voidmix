import type { PolicyFinding } from "./checks.js";

/** Where the Skills CLI writes the canonical copy of a vendored skill. */
export const vendoredSkillRoot = ".agents/skills";

/** Discovery roots that must hold a symlink, and the prefix each link needs. */
export const vendoredSkillLinks = [
  { root: ".claude/skills", prefix: "../../.agents/skills/" },
  { root: "skills", prefix: "../.agents/skills/" },
] as const;

interface LockedSkill {
  computedHash?: string;
  source?: string;
}

interface SkillsLock {
  skills?: Record<string, LockedSkill>;
}

function finding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "skills.vendored", location, message, fix, severity: "error" };
}

export function parseSkillsLock(content: string): string[] {
  const lock = JSON.parse(content) as SkillsLock;
  return Object.keys(lock.skills ?? {}).sort();
}

/**
 * Validates that every locked skill is installed and linked from each discovery
 * root, using the literal symlink text. An absolute or over-deep target resolves
 * on the machine that created it and breaks in every clone, so resolution alone
 * is not enough to check. Pure.
 *
 * @param installed skill names present under `.agents/skills`
 * @param linkTargets literal `readlink` text per `<root>/<name>`, null when the
 *   path is missing or is not a symlink
 */
export function validateVendoredSkills(
  locked: readonly string[],
  installed: readonly string[],
  linkTargets: ReadonlyMap<string, string | null>,
): PolicyFinding[] {
  const findings: PolicyFinding[] = [];
  const present = new Set(installed);

  for (const name of locked) {
    if (!present.has(name)) {
      findings.push(
        finding(
          `${vendoredSkillRoot}/${name}`,
          "locked skill is not installed",
          "run: bun run skills:update",
        ),
      );
      continue;
    }

    for (const { root, prefix } of vendoredSkillLinks) {
      const location = `${root}/${name}`;
      const expected = `${prefix}${name}`;
      const actual = linkTargets.get(location);
      if (actual === expected) continue;
      findings.push(
        finding(
          location,
          actual === null || actual === undefined
            ? "is missing or is not a symlink"
            : `points at ${actual} instead of ${expected}`,
          `run: rm -rf ${location} && ln -s ${expected} ${location}`,
        ),
      );
    }
  }

  for (const name of installed) {
    if (locked.includes(name)) continue;
    findings.push(
      finding(
        `${vendoredSkillRoot}/${name}`,
        "is installed but absent from skills-lock.json",
        `add it through the Skills CLI so the lockfile records its source and hash, or remove ${vendoredSkillRoot}/${name}`,
      ),
    );
  }

  return findings;
}
