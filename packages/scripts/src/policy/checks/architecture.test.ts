import { describe, expect, it } from "vite-plus/test";
import { checkArchitecture } from "./architecture.js";
function fixture(
  entries: Record<
    string,
    {
      deps?: string[];
      dev?: string[];
      source?: string;
      exports?: Record<string, string>;
      paths?: Record<string, string[]>;
    }
  >,
) {
  const files: Record<string, string> = {};
  for (const [path, item] of Object.entries(entries)) {
    files[`${path}/package.json`] = JSON.stringify({
      name: `@voidmix/${path.split("/").at(-1)}`,
      dependencies: Object.fromEntries(
        (item.deps ?? []).map((n) => [`@voidmix/${n}`, "workspace:*"]),
      ),
      devDependencies: Object.fromEntries(
        (item.dev ?? []).map((n) => [`@voidmix/${n}`, "workspace:*"]),
      ),
      exports: item.exports ?? { ".": "./src/index.ts" },
    });
    if (item.source) files[`${path}/src/index.ts`] = item.source;
    if (item.paths)
      files[`${path}/tsconfig.json`] = JSON.stringify({ compilerOptions: { paths: item.paths } });
  }
  return checkArchitecture(
    {
      repositoryRoot: "/repo",
      readFile: async (path) => files[path.slice(6)]!,
      pathExists: async (path) => path.slice(6) in files,
    },
    Object.keys(entries),
    Object.keys(files),
  );
}
describe("architecture boundaries", () => {
  it("rejects reversed production edges and dependency cycles", async () => {
    const findings = await fixture({
      "packages/core": { deps: ["application"] },
      "packages/application": { deps: ["core"] },
    });
    expect(findings.some((f) => f.message.includes("must not depend"))).toBe(true);
    expect(findings.some((f) => f.message.includes("cycle:"))).toBe(true);
  });
  it.each([
    ['import {x} from "@voidmix/db/src/private";', "private cross-package"],
    ['export * from "../../../packages/db/src/index";', "private cross-package"],
    ['const x=import("@voidmix/scripts");', "forbidden runtime"],
    ['type T=import("@voidmix/db").T;', "forbidden runtime"],
    ['import "@private/db";', "private cross-package"],
  ])("checks static, dynamic, type and aliased imports: %s", async (source, message) => {
    const findings = await fixture({
      "apps/web": { source, paths: { "@private/*": ["../../packages/*/src/index.ts"] } },
      "packages/db": {},
      "packages/scripts": {},
    });
    expect(findings.some((f) => f.message.includes(message))).toBe(true);
  });
  it("rejects imports between apps", async () => {
    expect(
      (await fixture({ "apps/web": { deps: ["desktop"] }, "apps/desktop": {} })).some((f) =>
        f.message.includes("must not depend"),
      ),
    ).toBe(true);
  });
  it("permits declared public subpaths and test-only reverse dependencies", async () => {
    expect(
      await fixture({
        "apps/web": { deps: ["ui"], source: 'import "@voidmix/ui/components/ui/button";' },
        "packages/ui": { exports: { "./components/ui/*": "./src/components/ui/*.tsx" } },
        "packages/db": { deps: ["core"], dev: ["application"] },
        "packages/core": {},
        "packages/application": { deps: ["core"] },
      }),
    ).toEqual([]);
  });
  it("does not allow a dev dependency to enter runtime source", async () => {
    expect(
      (
        await fixture({
          "packages/db": { dev: ["application"], source: 'import "@voidmix/application";' },
          "packages/application": {},
        })
      ).some((f) => f.message.includes("declared production dependency")),
    ).toBe(true);
  });
});
