import { describe, expect, it } from "vite-plus/test";

import { collectRelativeLinks, reachableFrom } from "./links.js";

describe("collectRelativeLinks", () => {
  it("resolves a sibling link relative to the file's directory", () => {
    const links = collectRelativeLinks("docs/development/agents.md", "See [testing](testing.md).");

    expect(links).toEqual([{ target: "testing.md", resolved: "docs/development/testing.md" }]);
  });

  it("resolves parent traversal", () => {
    const links = collectRelativeLinks(
      "packages/db/AGENTS.md",
      "See [tooling](../../docs/architecture/tooling.md).",
    );

    expect(links[0]?.resolved).toBe("docs/architecture/tooling.md");
  });

  it("resolves a root-relative link", () => {
    const links = collectRelativeLinks("docs/README.md", "See [root](/AGENTS.md).");

    expect(links[0]?.resolved).toBe("AGENTS.md");
  });

  it("ignores external and in-page targets", () => {
    const content = [
      "[http](http://example.com/a.md)",
      "[https](https://example.com/b.md)",
      "[mail](mailto:someone@example.com)",
      "[protocol relative](//example.com/c.md)",
      "[anchor](#section)",
    ].join("\n");

    expect(collectRelativeLinks("README.md", content)).toEqual([]);
  });

  it("strips fragments and queries before resolving", () => {
    const links = collectRelativeLinks("AGENTS.md", "See [testing](docs/x.md#a-section).");

    expect(links).toEqual([{ target: "docs/x.md#a-section", resolved: "docs/x.md" }]);
  });

  it("deduplicates repeated targets", () => {
    const links = collectRelativeLinks("AGENTS.md", "[a](docs/x.md) and [b](docs/x.md)");

    expect(links).toHaveLength(1);
  });

  it("ignores a link whose target is only a fragment of the current file", () => {
    expect(collectRelativeLinks("AGENTS.md", "[a](#)")).toEqual([]);
  });

  it("handles a titled link", () => {
    const links = collectRelativeLinks("AGENTS.md", '[a](docs/x.md "A title")');

    expect(links[0]?.resolved).toBe("docs/x.md");
  });
});

describe("reachableFrom", () => {
  const edges = new Map<string, string[]>([
    ["docs/README.md", ["docs/architecture/README.md"]],
    ["docs/architecture/README.md", ["docs/architecture/decisions/README.md"]],
    ["docs/architecture/decisions/README.md", ["docs/architecture/decisions/0001-a.md"]],
    ["docs/architecture/decisions/0001-a.md", []],
    ["docs/orphan.md", ["docs/README.md"]],
  ]);

  it("reaches a document through a chain of sub-indexes", () => {
    expect(reachableFrom("docs/README.md", edges)).toContain(
      "docs/architecture/decisions/0001-a.md",
    );
  });

  it("does not reach a document that only links inward", () => {
    expect(reachableFrom("docs/README.md", edges).has("docs/orphan.md")).toBe(false);
  });

  it("includes the entry point itself", () => {
    expect(reachableFrom("docs/README.md", new Map())).toEqual(new Set(["docs/README.md"]));
  });

  it("terminates on a cycle", () => {
    const cyclic = new Map<string, string[]>([
      ["a.md", ["b.md"]],
      ["b.md", ["a.md"]],
    ]);

    expect(reachableFrom("a.md", cyclic)).toEqual(new Set(["a.md", "b.md"]));
  });
});
