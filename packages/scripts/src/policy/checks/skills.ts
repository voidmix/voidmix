import { join } from "node:path";

import type { PolicyDependencies, PolicyFinding } from "../checks.js";
import { parseSkillsLock, validateVendoredSkills, vendoredSkillLinks } from "../skills.js";

const projectSkill = "skills/voidmix-infra/SKILL.md";
const skillSymlink = ".claude/skills/voidmix-infra";
const expectedSkillTarget = "../../skills/voidmix-infra";
const skillsLock = "skills-lock.json";

export async function checkProjectSkill(
  dependencies: PolicyDependencies,
): Promise<PolicyFinding[]> {
  const findings: PolicyFinding[] = [];
  const skillPath = join(dependencies.repositoryRoot, projectSkill);

  if (!(await dependencies.pathExists(skillPath))) {
    findings.push({
      check: "skills.project",
      location: projectSkill,
      message: "the project skill is missing",
      fix: `create ${projectSkill} with name and description frontmatter`,
      severity: "error",
    });
  } else {
    const content = await dependencies.readFile(skillPath);
    if (!/^---\n[\s\S]*?\bname:\s*\S/m.test(content)) {
      findings.push({
        check: "skills.project",
        location: projectSkill,
        message: "frontmatter is missing a name field",
        fix: `add "name: voidmix-infra" to the frontmatter of ${projectSkill}`,
        severity: "error",
      });
    }
    if (!/^---\n[\s\S]*?\bdescription:\s*\S/m.test(content)) {
      findings.push({
        check: "skills.project",
        location: projectSkill,
        message: "frontmatter is missing a description field",
        fix: `add a description to the frontmatter of ${projectSkill} so the skill can be selected`,
        severity: "error",
      });
    }
    if (/\bTODO\b/.test(content)) {
      findings.push({
        check: "skills.project",
        location: projectSkill,
        message: "contains an unresolved TODO",
        fix: `resolve or remove the TODO in ${projectSkill}; agents read it as instruction`,
        severity: "error",
      });
    }
  }

  const linkTarget = await dependencies.readLink(join(dependencies.repositoryRoot, skillSymlink));
  if (linkTarget !== expectedSkillTarget) {
    findings.push({
      check: "skills.project",
      location: skillSymlink,
      message:
        linkTarget === null
          ? "is missing or is not a symlink"
          : `points at ${linkTarget} instead of ${expectedSkillTarget}`,
      fix: `run: rm -rf ${skillSymlink} && ln -s ${expectedSkillTarget} ${skillSymlink}`,
      severity: "error",
    });
  }
  return findings;
}

export async function checkVendoredSkills(
  dependencies: PolicyDependencies,
): Promise<PolicyFinding[]> {
  const lockPath = join(dependencies.repositoryRoot, skillsLock);
  const installed = await dependencies.listVendoredSkills();
  if (!(await dependencies.pathExists(lockPath))) {
    if (installed.length === 0) return [];
    return [
      {
        check: "skills.vendored",
        location: skillsLock,
        message: `${installed.length} vendored skills are installed with no lockfile`,
        fix: `commit ${skillsLock} so each skill's source and content hash are recorded`,
        severity: "error",
      },
    ];
  }

  let locked: string[];
  try {
    locked = parseSkillsLock(await dependencies.readFile(lockPath));
  } catch {
    return [
      {
        check: "skills.vendored",
        location: skillsLock,
        message: "is not valid JSON",
        fix: `repair ${skillsLock} or regenerate it with: bun run skills:update`,
        severity: "error",
      },
    ];
  }

  const linkTargets = new Map<string, string | null>();
  for (const name of [...locked, ...installed]) {
    for (const { root } of vendoredSkillLinks) {
      const location = `${root}/${name}`;
      if (linkTargets.has(location)) continue;
      linkTargets.set(
        location,
        await dependencies.readLink(join(dependencies.repositoryRoot, location)),
      );
    }
  }
  return validateVendoredSkills(locked, installed, linkTargets);
}
