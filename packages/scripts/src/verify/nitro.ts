import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

export interface NitroRuntimeTarget {
  directory: string;
  expectedText?: string;
  name: string;
  pathname: string;
}

interface NitroMetadata {
  preset: string;
  serverEntry: string;
}

interface NitroRuntimeVerificationOptions {
  allocatePort?: () => Promise<number>;
  readMetadata?: (path: string) => Promise<string>;
  targets?: readonly NitroRuntimeTarget[];
}

const defaultTargets: readonly NitroRuntimeTarget[] = [
  { directory: "apps/web", expectedText: "Ask Voidmix", name: "Web", pathname: "/" },
  { directory: "apps/api", name: "API", pathname: "/health" },
];

const nitroProbe = [
  "const [entryUrl, pathname, name, expectedText = ''] = process.argv.slice(1);",
  'const host = process.env.NITRO_HOST ?? "127.0.0.1";',
  "const port = process.env.NITRO_PORT ?? process.env.PORT;",
  'const url = new URL(pathname, "http://" + host + ":" + port);',
  "const deadline = Date.now() + 10_000;",
  'let lastFailure = "server did not become ready";',
  "try {",
  "  await import(entryUrl);",
  "  while (Date.now() < deadline) {",
  "    try {",
  "      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });",
  "      const body = await response.text();",
  "      if (response.status !== 200) {",
  '        lastFailure = "received HTTP " + response.status;',
  "      } else if (expectedText && !body.includes(expectedText)) {",
  '        lastFailure = "response did not contain expected text";',
  "      } else {",
  "        process.exit(0);",
  "      }",
  "    } catch (error) {",
  "      lastFailure = error instanceof Error ? error.message : String(error);",
  "    }",
  "    await new Promise((resolve) => setTimeout(resolve, 100));",
  "  }",
  "  throw new Error(lastFailure);",
  "} catch (error) {",
  "  const message = error instanceof Error ? error.message : String(error);",
  '  console.error("Nitro runtime check failed for " + name + ": " + message);',
  "  process.exit(1);",
  "}",
].join("\n");

function parseMetadata(raw: string, target: NitroRuntimeTarget): NitroMetadata {
  const metadata: unknown = JSON.parse(raw);
  if (!metadata || typeof metadata !== "object") {
    throw new Error(`${target.name} Nitro metadata must be an object.`);
  }

  const { preset, serverEntry } = metadata as Record<string, unknown>;
  if (preset !== "node-server") {
    throw new Error(`${target.name} Nitro output uses ${String(preset)} instead of node-server.`);
  }
  if (typeof serverEntry !== "string" || serverEntry.length === 0) {
    throw new Error(`${target.name} Nitro metadata is missing serverEntry.`);
  }
  return { preset, serverEntry };
}

function resolveServerEntry(outputDirectory: string, serverEntry: string): string {
  const entry = resolve(outputDirectory, serverEntry);
  const relativeEntry = relative(outputDirectory, entry);
  if (relativeEntry.startsWith("..") || isAbsolute(relativeEntry)) {
    throw new Error(`Nitro serverEntry points outside its output directory: ${serverEntry}`);
  }
  return entry;
}

function createRuntimeEnvironment(processEnv: NodeJS.ProcessEnv, port: number): NodeJS.ProcessEnv {
  const environment = { ...processEnv };
  delete environment.DATABASE_URL;
  return {
    ...environment,
    DATABASE_URL: "postgres://voidmix:verify@example.invalid:5432/voidmix",
    ALLOWED_ORIGINS: "http://localhost:3000",
    AUTH_SECRET: "verify-only-secret-that-is-long-enough-for-better-auth",
    AUTH_URL: "http://127.0.0.1:" + port,
    RESEND_API_KEY: "verify-resend-key",
    MAIL_FROM: "verify@voidmix.local",
    MAIL_FROM_NAME: "Voidmix Verify",
    LOG_LEVEL: "error",
    LOG_PRETTY: "false",
    NITRO_HOST: "127.0.0.1",
    NITRO_PORT: String(port),
    NODE_ENV: "production",
    PORT: String(port),
  };
}

export async function allocateLocalPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
    throw new Error("Could not allocate a local port for Nitro runtime verification.");
  }

  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
  return address.port;
}

export async function verifyNitroRuntimes(
  dependencies: RepositoryProcessDependencies,
  options: NitroRuntimeVerificationOptions = {},
): Promise<void> {
  const allocatePort = options.allocatePort ?? allocateLocalPort;
  const readMetadata = options.readMetadata ?? ((path) => readFile(path, "utf8"));

  for (const target of options.targets ?? defaultTargets) {
    const outputDirectory = join(dependencies.repositoryRoot, target.directory, ".output");
    const metadata = parseMetadata(await readMetadata(join(outputDirectory, "nitro.json")), target);
    const serverEntry = resolveServerEntry(outputDirectory, metadata.serverEntry);
    const port = await allocatePort();

    dependencies.log("info", "verify.runtime.started", { service: target.name });
    await dependencies.runCommand(
      [
        "node",
        "--input-type=module",
        "--eval",
        nitroProbe,
        pathToFileURL(serverEntry).href,
        target.pathname,
        target.name,
        target.expectedText ?? "",
      ],
      {
        cwd: outputDirectory,
        env: createRuntimeEnvironment(dependencies.processEnv, port),
      },
    );
    dependencies.log("info", "verify.runtime.completed", { service: target.name });
  }
}
