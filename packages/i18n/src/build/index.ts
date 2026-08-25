import { createHash } from "node:crypto";
import nodeFs from "node:fs";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type { Plugin } from "vite";
import { build } from "esbuild";

import { loadProjectFromDirectory } from "@inlang/sdk";
import { compileProject } from "@inlang/paraglide-js";
import { writeOutput } from "@inlang/paraglide-js";

// Keep the compiler entry self-contained because Vite config files load it
// directly through Node before application transforms run.
const LOCALE_COOKIE_NAME = "voidmix_locale";
const LOCALE_COOKIE_MAX_AGE_SECONDS = 31_536_000;

export type DefineI18nProjectOptions = {
  root: string;
  messages?: string;
  project?: string;
  outdir?: string;
  fingerprintFile?: string;
};

export type I18nProject = {
  root: string;
  messages: string;
  project: string;
  outdir: string;
  fingerprintFile: string;
};

export type I18nGenerationResult = {
  generated: boolean;
  fingerprint: string;
};

const VIRTUAL_PREFIX = "virtual:voidmix-i18n/";

export function defineI18nProject(options: DefineI18nProjectOptions): I18nProject {
  const root = resolve(options.root);
  const outdir = resolve(root, options.outdir ?? "src/generated/i18n");
  return {
    root,
    messages: resolve(root, options.messages ?? "messages"),
    project: resolve(root, options.project ?? "project.inlang"),
    outdir,
    fingerprintFile: resolve(
      root,
      options.fingerprintFile ??
        join(options.outdir ?? "src/generated/i18n", ".voidmix-input-hash"),
    ),
  };
}

export async function generateI18n(project: I18nProject): Promise<I18nGenerationResult> {
  const fingerprint = await calculateFingerprint(project);
  const previous = await readFile(project.fingerprintFile, "utf8").catch(() => undefined);
  if (previous?.trim() === fingerprint) return { generated: false, fingerprint };

  const inlang = await loadProjectFromDirectory({ path: project.project, fs: nodeFs });
  try {
    const projectErrors = await inlang.errors.get();
    if (projectErrors.length > 0) {
      throw new AggregateError(
        projectErrors,
        `Could not load Inlang project at ${project.project}`,
      );
    }
    const output = await compileProject({
      project: inlang,
      projectPath: project.project,
      compilerOptions: {
        outputStructure: "locale-modules",
        emitGitIgnore: false,
        emitPrettierIgnore: false,
        emitReadme: false,
        emitTsDeclarations: true,
        cookieName: LOCALE_COOKIE_NAME,
        cookieMaxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
        strategy: ["cookie", "globalVariable", "baseLocale"],
        isServer: 'typeof window === "undefined"',
      },
    });
    const settings = await inlang.settings.get();
    const catalogs = await readMessageIds(project.messages);
    const namespaceOutput = createNamespaceOutput(catalogs, settings.locales);
    Object.assign(output, namespaceOutput);
    output["messages/package.json"] =
      `${JSON.stringify({ type: "module", sideEffects: false }, undefined, 2)}\n`;
    await writeOutput({
      directory: project.outdir,
      output,
      cleanDirectory: true,
      fs: await import("node:fs/promises"),
    });
    await bundleNamespaceCatalogs(project.outdir, Object.keys(namespaceOutput));
    await mkdir(dirname(project.fingerprintFile), { recursive: true });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(project.fingerprintFile, `${fingerprint}\n`, "utf8");
    return { generated: true, fingerprint };
  } finally {
    await inlang.close();
  }
}

export function i18nVitePlugin(project: I18nProject): Plugin {
  return {
    name: "voidmix-i18n",
    async buildStart() {
      this.addWatchFile(join(project.project, "settings.json"));
      for (const file of await filesIn(project.messages)) this.addWatchFile(file);
      await generateI18n(project);
    },
    async handleHotUpdate({ file, server }) {
      if (!file.startsWith(project.messages) && !file.startsWith(project.project)) return;
      await generateI18n(project);
      server.ws.send({ type: "full-reload" });
      return [];
    },
    resolveId(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      const namespace = id.slice(VIRTUAL_PREFIX.length);
      return join(
        project.outdir,
        "messages",
        "_namespaces",
        encodeNamespace(namespace),
        "loader.js",
      );
    },
  };
}

async function calculateFingerprint(project: I18nProject) {
  const files = [join(project.project, "settings.json"), ...(await filesIn(project.messages))];
  const hash = createHash("sha256");
  for (const file of [...files].sort()) {
    hash.update(relative(project.root, file));
    hash.update(await readFile(file));
  }
  hash.update("voidmix-i18n-paraglide-locale-modules-v3-sync-loaders");
  return hash.digest("hex");
}

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const file = join(directory, entry.name);
      return entry.isDirectory() ? filesIn(file) : [file];
    }),
  );
  return nested.flat();
}

async function readMessageIds(directory: string) {
  const ids = new Set<string>();
  for (const file of await filesIn(directory)) {
    if (!file.endsWith(".json")) continue;
    const value = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    flattenIds(value).forEach((id) => ids.add(id));
  }
  return [...ids].sort();
}

function flattenIds(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    if (key === "$schema") return [];
    const id = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "object" && child !== null && !Array.isArray(child))
      return flattenIds(child as Record<string, unknown>, id);
    return [id];
  });
}

function createNamespaceOutput(ids: readonly string[], locales: readonly string[]) {
  const output: Record<string, string> = {};
  const namespaces = new Map<string, string[]>();
  for (const id of ids) {
    const parts = id.split(".");
    if (parts.length < 2) {
      const current = namespaces.get("common") ?? [];
      current.push(id);
      namespaces.set("common", current);
      continue;
    }
    const namespace = parts.slice(0, -1).join(".");
    const current = namespaces.get(namespace) ?? [];
    current.push(id);
    namespaces.set(namespace, current);
  }

  for (const [namespace, messageIds] of namespaces) {
    const encoded = encodeNamespace(namespace);
    for (const locale of locales) {
      const imports = messageIds.map((id) => {
        const symbol = safeModuleId(id);
        return `import { ${symbol} as message_${symbol} } from "../../${locale}.js";`;
      });
      const properties = messageIds.map((id) => {
        const symbol = safeModuleId(id);
        const key = id.split(".").at(-1) ?? id;
        return `  ${JSON.stringify(key)}: message_${symbol},`;
      });
      output[`messages/_namespaces/${encoded}/${locale}.js`] =
        `${imports.join("\n")}\n\nexport default {\n${properties.join("\n")}\n};\n`;
    }
    output[`messages/_namespaces/${encoded}/loader.js`] =
      [
        "export function loadNamespace(locale) {",
        ...locales.map(
          (locale) =>
            `  if (locale === ${JSON.stringify(locale)}) return import("./${locale}.js").then((module) => module.default);`,
        ),
        `  return import("./${locales[0] ?? "en"}.js").then((module) => module.default);`,
        "}",
      ].join("\n") + "\n";
    output[`messages/_namespaces/${encoded}/loader.d.ts`] =
      'export declare function loadNamespace(locale: import("../../../runtime.js").Locale): Promise<Record<string, (values?: Record<string, unknown>) => string>>;\n';
    output[`messages/_namespaces/${encoded}/loader.sync.js`] =
      [
        ...locales.map((locale) => `import catalog_${safeModuleId(locale)} from "./${locale}.js";`),
        "",
        "const catalogs = {",
        ...locales.map((locale) => `  ${JSON.stringify(locale)}: catalog_${safeModuleId(locale)},`),
        "};",
        "",
        "export function loadNamespace(locale) {",
        `  return catalogs[locale] ?? catalogs[${JSON.stringify(locales[0] ?? "en")}];`,
        "}",
      ].join("\n") + "\n";
    output[`messages/_namespaces/${encoded}/loader.sync.d.ts`] =
      'export declare function loadNamespace(locale: import("../../../runtime.js").Locale): Record<string, (values?: Record<string, unknown>) => string>;\n';
  }
  return output;
}

async function bundleNamespaceCatalogs(outdir: string, generatedFiles: readonly string[]) {
  const localeModules = generatedFiles.filter(
    (file) =>
      file.includes("/_namespaces/") &&
      file.endsWith(".js") &&
      !file.endsWith("/loader.js") &&
      !file.endsWith("/loader.sync.js"),
  );

  await Promise.all(
    localeModules.map(async (file) => {
      const entry = join(outdir, file);
      const result = await build({
        entryPoints: [entry],
        bundle: true,
        format: "esm",
        platform: "neutral",
        target: "es2022",
        treeShaking: true,
        write: false,
      });
      const bundled = result.outputFiles[0];
      if (!bundled) throw new Error(`esbuild produced no output for ${entry}`);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(entry, bundled.contents);
    }),
  );
}

function encodeNamespace(namespace: string) {
  return Buffer.from(namespace, "utf8").toString("hex");
}

function safeModuleId(id: string) {
  const result = id.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const startsWithNumber = result[0]?.match(/[0-9]/);
  if (startsWithNumber) return `_${result}`;
  const reserved = new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "let",
    "static",
    "yield",
    "await",
    "enum",
    "implements",
    "interface",
    "package",
    "private",
    "protected",
    "public",
    "then",
  ]);
  if (reserved.has(result)) return `_${result}`;
  let uppercase = 0;
  for (const character of id) if (/[A-Z]/.test(character)) uppercase += 1;
  return result + (uppercase > 0 ? uppercase : "");
}
