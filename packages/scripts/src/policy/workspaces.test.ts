import { describe, expect, it } from "vite-plus/test";

import {
  findEmptyDirectories,
  findNonWorkspaceDirectories,
  parseDeclaredWorkspaces,
  parseListedWorkspacePaths,
  validateListedWorkspacePaths,
  validateWorkspaceInventory,
} from "./workspaces.js";

const rootAgents = [
  "# Voidmix Repository Instructions",
  "",
  "## Repository shape (dependencies flow downward only)",
  "",
  "```text",
  "apps        web, api          composition roots; never imported",
  "core        core, db          db implements interfaces owned by core",
  "tooling     scripts, e2e      never imported by runtime code",
  "```",
  "",
  "## Architecture rules",
  "",
  "- Something else entirely.",
].join("\n");

const members = ["apps/api", "apps/web", "e2e", "packages/core", "packages/db", "packages/scripts"];

describe("parseDeclaredWorkspaces", () => {
  it("reads the names out of the Repository shape fence", () => {
    expect(parseDeclaredWorkspaces(rootAgents).sort()).toEqual([
      "api",
      "core",
      "db",
      "e2e",
      "scripts",
      "web",
    ]);
  });

  it("returns nothing when the section is absent", () => {
    expect(parseDeclaredWorkspaces("# Title\n\n## Other\n\ntext\n")).toEqual([]);
  });

  it("does not read a fence belonging to a later section", () => {
    const withoutShape = ["# Title", "", "## Testing", "", "```bash", "bun run test", "```"].join(
      "\n",
    );

    expect(parseDeclaredWorkspaces(withoutShape)).toEqual([]);
  });
});

describe("validateWorkspaceInventory", () => {
  it("accepts a listing that matches the resolved workspaces", () => {
    expect(validateWorkspaceInventory(members, rootAgents)).toEqual([]);
  });

  it("reports a workspace that is missing from the listing", () => {
    const findings = validateWorkspaceInventory([...members, "packages/auth"], rootAgents);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "workspace.listing",
      location: "AGENTS.md",
      message: "workspace packages/auth is not listed in Repository shape",
    });
    expect(findings[0]?.fix).toContain("auth");
  });

  it("reports a listed name that is not a workspace", () => {
    const findings = validateWorkspaceInventory(
      members.filter((member) => member !== "packages/db"),
      rootAgents,
    );

    expect(findings.map((finding) => finding.message)).toEqual([
      "Repository shape lists db, which is not a workspace",
    ]);
  });

  it("reports an unparseable listing once rather than flagging every workspace", () => {
    const findings = validateWorkspaceInventory(members, "# Title\n\n## Other\n\ntext\n");

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe("the Repository shape fence lists no workspaces");
  });
});

describe("findNonWorkspaceDirectories", () => {
  it("accepts a tree where every glob match is a workspace", () => {
    expect(findNonWorkspaceDirectories(members, members)).toEqual([]);
  });

  it("reports a directory that sits under a glob without a package.json", () => {
    const findings = findNonWorkspaceDirectories([...members, "packages/audit"], members);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "workspace.directory",
      location: "packages/audit",
      message: "is matched by a workspace glob but has no package.json",
    });
    expect(findings[0]?.fix).toContain("rm -rf packages/audit");
  });

  it("reports every such directory, not just the first", () => {
    const findings = findNonWorkspaceDirectories(
      [...members, "packages/rpc", "packages/cache", "apps/worker"],
      members,
    );

    expect(findings.map((finding) => finding.location)).toEqual([
      "packages/rpc",
      "packages/cache",
      "apps/worker",
    ]);
  });
});

const readme = [
  "# Voidmix",
  "",
  "## Workspace map",
  "",
  "```text",
  "apps/web        TanStack Start user application",
  "apps/api        Nitro + Hono + oRPC API",
  "e2e             Playwright smoke tests",
  "",
  "packages/core   Framework-independent business rules",
  "packages/db     Drizzle schema and repository adapters",
  "packages/scripts Repository automation CLI",
  "```",
  "",
  "## Requirements",
].join("\n");

describe("parseListedWorkspacePaths", () => {
  it("reads paths out of a path-and-description fence", () => {
    expect(parseListedWorkspacePaths(readme, "Workspace map").sort()).toEqual(members);
  });

  it("ignores blank lines and prose inside the fence", () => {
    const noisy = readme.replace("```text\n", "```text\nSome prose line.\n\n");

    expect(parseListedWorkspacePaths(noisy, "Workspace map").sort()).toEqual(members);
  });

  it("returns nothing when the heading is absent", () => {
    expect(parseListedWorkspacePaths(readme, "Nonexistent")).toEqual([]);
  });
});

describe("validateListedWorkspacePaths", () => {
  it("accepts a listing that matches the resolved workspaces", () => {
    expect(validateListedWorkspacePaths("README.md", members, members)).toEqual([]);
  });

  it("reports a listed path that is no longer a workspace", () => {
    const findings = validateListedWorkspacePaths(
      "README.md",
      [...members, "apps/worker"],
      members,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe("lists apps/worker, which is not a workspace");
  });

  it("reports a workspace the listing omits", () => {
    const findings = validateListedWorkspacePaths(
      "README.md",
      members.filter((member) => member !== "packages/db"),
      members,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe("does not list packages/db");
  });
});

describe("findEmptyDirectories", () => {
  it("reports nothing when there are none", () => {
    expect(findEmptyDirectories([])).toEqual([]);
  });

  it("reports each directory with a removal command", () => {
    const findings = findEmptyDirectories(["apps/web/src/routes/api", "packages/scripts/src/ops"]);

    expect(findings.map((finding) => finding.location)).toEqual([
      "apps/web/src/routes/api",
      "packages/scripts/src/ops",
    ]);
    expect(findings[0]?.message).toBe(
      "contains no files at any depth, so it exists only in this working tree",
    );
    expect(findings[0]?.fix).toBe("remove it: rm -rf apps/web/src/routes/api");
    expect(findings[0]?.check).toBe("workspace.directory");
  });
});
