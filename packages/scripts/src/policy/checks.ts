import { join } from "node:path";

import { validateWorkspaceAgents } from "./agents.js";
import { parseIgnorePatterns, validateWorkspaceIgnore } from "./ignores.js";
import { collectRelativeLinks, reachableFrom } from "./links.js";
import {
  deriveWorkspaceShape,
  validateTestWiring,
  validateWorkspaceManifest,
} from "./manifests.js";
import { parseSkillsLock, validateVendoredSkills, vendoredSkillLinks } from "./skills.js";
import { isPresetFile, validateWorkspaceTypeScriptConfig } from "./tsconfig.js";
import {
  findEmptyDirectories,
  findNonWorkspaceDirectories,
  parseListedWorkspacePaths,
  validateListedWorkspacePaths,
  validateWorkspaceInventory,
} from "./workspaces.js";

export type PolicySeverity = "error" | "warn";

export interface PolicyFinding {
  /** Dotted check name, for example `agents.workspace`. */
  check: string;
  /** A copy-pasteable next step; rendered as a `Fix:` line. */
  fix: string;
  /** Repository-relative path the finding is about. */
  location: string;
  message: string;
  severity: PolicySeverity;
}

export interface PolicyReport {
  findings: PolicyFinding[];
  errors: number;
  warnings: number;
}

export interface PolicyDependencies {
  /** Repository-relative markdown files that policy owns. */
  listMarkdownFiles(): Promise<string[]>;
  /**
   * Every file inside the resolved workspaces, repository-relative with `/`
   * separators. Checks derive per-workspace facts from this one listing rather
   * than probing for hardcoded filenames, which is itself a form of drift.
   */
  listWorkspaceFiles(): Promise<string[]>;
  /**
   * Repository-relative workspace directories, resolved from Bun's workspace
   * globs. Directories without a `package.json` are not workspaces and must not
   * appear here.
   */
  listWorkspaceMembers(): Promise<string[]>;
  /** Every directory matched by a workspace glob, whether or not it is one. */
  listWorkspaceCandidates(): Promise<string[]>;
  /** Directories under the workspace roots that hold no files at any depth. */
  listEmptyDirectories(): Promise<string[]>;
  /** Skill names present under `.agents/skills`, excluding symlinks. */
  listVendoredSkills(): Promise<string[]>;
  pathExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  /** Resolves a symlink's literal target text, or null when it is not a link. */
  readLink(path: string): Promise<string | null>;
  /** Only `applyPolicyFixes` writes. The checks themselves never touch the tree. */
  writeFile(path: string, content: string): Promise<void>;
  repositoryRoot: string;
  /** Enable once the project skill is committed. */
  verifySkills: boolean;
}

const projectSkill = "skills/voidmix-infra/SKILL.md";
const skillSymlink = ".claude/skills/voidmix-infra";
const expectedSkillTarget = "../../skills/voidmix-infra";
const docsIndex = "docs/README.md";
const skillsLock = "skills-lock.json";
const readme = "README.md";
const readmeWorkspaceHeading = "Workspace map";
const ignoreFile = ".gitignore";

async function checkWorkspaceAgents(
  dependencies: PolicyDependencies,
  members: readonly string[],
): Promise<PolicyFinding[]> {
  const findings: PolicyFinding[] = [];
  for (const member of members) {
    const location = `${member}/AGENTS.md`;
    const absolute = join(dependencies.repositoryRoot, location);
    if (!(await dependencies.pathExists(absolute))) {
      findings.push({
        check: "agents.workspace",
        location,
        message: "workspace is missing AGENTS.md",
        fix: `create ${location} with Purpose, Interface, Ownership, Constraints, and Verification sections`,
        severity: "error",
      });
      continue;
    }
    findings.push(...validateWorkspaceAgents(location, await dependencies.readFile(absolute)));
  }
  return findings;
}

async function checkWorkspaceIgnores(
  dependencies: PolicyDependencies,
  members: readonly string[],
): Promise<PolicyFinding[]> {
  const rootPatterns = parseIgnorePatterns(
    await dependencies.readFile(join(dependencies.repositoryRoot, ignoreFile)),
  );

  const findings: PolicyFinding[] = [];
  for (const member of members) {
    const location = `${member}/${ignoreFile}`;
    const absolute = join(dependencies.repositoryRoot, location);
    // A workspace that produces no output owns no ignore rules. That is the
    // layering working, not an omission, so absence is never a finding.
    if (!(await dependencies.pathExists(absolute))) continue;
    findings.push(
      ...validateWorkspaceIgnore(location, await dependencies.readFile(absolute), rootPatterns),
    );
  }
  return findings;
}

async function checkWorkspaceManifests(
  dependencies: PolicyDependencies,
  members: readonly string[],
  workspaceFiles: readonly string[],
): Promise<PolicyFinding[]> {
  const findings: PolicyFinding[] = [];
  for (const member of members) {
    // A member without a package.json is not a member, so absence is already
    // reported by the workspace-directory check rather than here.
    const location = `${member}/package.json`;
    const shape = deriveWorkspaceShape(member, workspaceFiles);
    findings.push(
      ...validateWorkspaceManifest(
        location,
        await dependencies.readFile(join(dependencies.repositoryRoot, location)),
        shape,
      ),
      ...validateTestWiring(`${member}/vitest.config.ts`, shape),
    );
  }
  return findings;
}

async function checkTypeScriptConfigs(
  dependencies: PolicyDependencies,
  members: readonly string[],
  workspaceFiles: readonly string[],
): Promise<PolicyFinding[]> {
  // Which files are presets is read from the directory, not listed here, so a
  // sixth preset needs no change on this side.
  const presets = new Map<string, string>();
  for (const file of workspaceFiles.filter(isPresetFile)) {
    presets.set(file, await dependencies.readFile(join(dependencies.repositoryRoot, file)));
  }

  const findings: PolicyFinding[] = [];
  for (const member of members) {
    for (const config of deriveWorkspaceShape(member, workspaceFiles).typeScriptConfigs) {
      const location = `${member}/${config}`;
      findings.push(
        ...validateWorkspaceTypeScriptConfig(
          location,
          await dependencies.readFile(join(dependencies.repositoryRoot, location)),
          presets,
        ),
      );
    }
  }
  return findings;
}

async function checkDocumentationLinks(
  dependencies: PolicyDependencies,
  files: readonly string[],
): Promise<PolicyFinding[]> {
  const findings: PolicyFinding[] = [];
  for (const file of files) {
    const content = await dependencies.readFile(join(dependencies.repositoryRoot, file));
    for (const link of collectRelativeLinks(file, content)) {
      if (await dependencies.pathExists(join(dependencies.repositoryRoot, link.resolved))) continue;
      findings.push({
        check: "docs.links",
        location: file,
        message: `link target does not exist: ${link.target}`,
        fix: `point the link at an existing path or remove it from ${file}`,
        severity: "error",
      });
    }
  }
  return findings;
}

async function checkDocumentationIndex(
  dependencies: PolicyDependencies,
  files: readonly string[],
): Promise<PolicyFinding[]> {
  const indexPath = join(dependencies.repositoryRoot, docsIndex);
  if (!(await dependencies.pathExists(indexPath))) {
    return [
      {
        check: "docs.index",
        location: docsIndex,
        message: "the documentation index is missing",
        fix: `create ${docsIndex} and link every document under docs/`,
        severity: "error",
      },
    ];
  }

  // Reachability is transitive: docs/README.md may delegate to a sub-index such
  // as docs/architecture/decisions/README.md rather than listing every file.
  const documents = files.filter((file) => file.startsWith("docs/"));
  const edges = new Map<string, string[]>();
  for (const file of documents) {
    const links = collectRelativeLinks(
      file,
      await dependencies.readFile(join(dependencies.repositoryRoot, file)),
    );
    edges.set(
      file,
      links.map((link) => link.resolved).filter((target) => target.endsWith(".md")),
    );
  }

  const reachable = reachableFrom(docsIndex, edges);

  return documents
    .filter((file) => !reachable.has(file))
    .map((file) => ({
      check: "docs.index",
      location: file,
      message: `not reachable from ${docsIndex}`,
      fix: `link ${file} from ${docsIndex} or from a document it already reaches; AGENTS.md declares ${docsIndex} the navigation index`,
      severity: "error" as const,
    }));
}

async function checkProjectSkill(dependencies: PolicyDependencies): Promise<PolicyFinding[]> {
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

async function checkVendoredSkills(dependencies: PolicyDependencies): Promise<PolicyFinding[]> {
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

function createPolicyReport(findings: PolicyFinding[]): PolicyReport {
  return {
    findings,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warn").length,
  };
}

export async function runPolicy(dependencies: PolicyDependencies): Promise<PolicyReport> {
  const [members, candidates, empty, files, workspaceFiles] = await Promise.all([
    dependencies.listWorkspaceMembers(),
    dependencies.listWorkspaceCandidates(),
    dependencies.listEmptyDirectories(),
    dependencies.listMarkdownFiles(),
    dependencies.listWorkspaceFiles(),
  ]);
  const rootAgents = await dependencies.readFile(join(dependencies.repositoryRoot, "AGENTS.md"));
  const readmeContent = await dependencies.readFile(join(dependencies.repositoryRoot, readme));

  // A glob-matched directory that is also empty would otherwise be reported
  // twice for the same problem, with the same remedy.
  const nonWorkspace = findNonWorkspaceDirectories(candidates, members);
  const alreadyReported = new Set(nonWorkspace.map((finding) => finding.location));

  const findings = [
    ...(await checkWorkspaceAgents(dependencies, members)),
    ...validateWorkspaceInventory(members, rootAgents),
    ...nonWorkspace,
    ...findEmptyDirectories(empty.filter((directory) => !alreadyReported.has(directory))),
    ...validateListedWorkspacePaths(
      readme,
      parseListedWorkspacePaths(readmeContent, readmeWorkspaceHeading),
      members,
    ),
    ...(await checkWorkspaceIgnores(dependencies, members)),
    ...(await checkWorkspaceManifests(dependencies, members, workspaceFiles)),
    ...(await checkTypeScriptConfigs(dependencies, members, workspaceFiles)),
    ...(await checkDocumentationLinks(dependencies, files)),
    ...(await checkDocumentationIndex(dependencies, files)),
    ...(dependencies.verifySkills
      ? [...(await checkProjectSkill(dependencies)), ...(await checkVendoredSkills(dependencies))]
      : []),
  ];
  return createPolicyReport(findings);
}
