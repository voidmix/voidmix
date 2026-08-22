import type { PolicyFinding } from "./checks.js";

export const requiredAgentsSections = [
  "Purpose",
  "Interface",
  "Ownership",
  "Constraints",
  "Verification",
] as const;

export const maximumAgentsLines = 120;

const sectionGuidance: Record<(typeof requiredAgentsSections)[number], string> = {
  Purpose: "state why the workspace exists and what it is for",
  Interface: "list the entrypoints, exports, or structures callers need",
  Ownership: "state which behavior this workspace owns and does not own",
  Constraints: "record dependency, runtime, and implementation invariants",
  Verification: "list the focused commands that validate changes",
};

interface Section {
  body: string;
  title: string;
}

function parseSections(content: string): Section[] {
  const sections: Section[] = [];
  let current: Section | undefined;
  for (const line of content.split("\n")) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading?.[1]) {
      current = { title: heading[1], body: "" };
      sections.push(current);
      continue;
    }
    if (current) current.body += `${line}\n`;
  }
  return sections;
}

function finding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "agents.workspace", location, message, fix, severity: "error" };
}

/**
 * Validates one workspace AGENTS.md against the shared five-section schema.
 * Pure: it reads nothing and only inspects the text it is given.
 */
export function validateWorkspaceAgents(location: string, content: string): PolicyFinding[] {
  const findings: PolicyFinding[] = [];
  const sections = parseSections(content);
  const titles = sections.map((section) => section.title);

  for (const required of requiredAgentsSections) {
    const section = sections.find((candidate) => candidate.title === required);
    if (!section) {
      findings.push(
        finding(
          location,
          `missing ## ${required}`,
          `add a "## ${required}" section and ${sectionGuidance[required]}`,
        ),
      );
      continue;
    }
    if (section.body.trim().length === 0) {
      findings.push(
        finding(
          location,
          `## ${required} is empty`,
          `fill in "## ${required}" and ${sectionGuidance[required]}`,
        ),
      );
    }
  }

  const present = requiredAgentsSections.filter((required) => titles.includes(required));
  const ordered = titles.filter((title): title is (typeof requiredAgentsSections)[number] =>
    (requiredAgentsSections as readonly string[]).includes(title),
  );
  if (present.length === requiredAgentsSections.length && ordered.join() !== present.join()) {
    findings.push(
      finding(
        location,
        `sections are out of order: ${ordered.join(", ")}`,
        `reorder the sections to ${requiredAgentsSections.join(", ")}`,
      ),
    );
  }

  const lines = content.replace(/\n$/, "").split("\n").length;
  if (lines > maximumAgentsLines) {
    findings.push(
      finding(
        location,
        `has ${lines} lines`,
        `keep AGENTS.md at or below ${maximumAgentsLines} lines and link to docs/ instead`,
      ),
    );
  }

  return findings;
}
