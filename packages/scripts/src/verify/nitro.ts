import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

export interface NitroRuntimeTarget {
  directory: string;
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

const defaultTargets = [
  { directory: "apps/web", name: "Web", pathname: "/" },
  { directory: "apps/admin", name: "Admin", pathname: "/" },
  { directory: "apps/api", name: "API", pathname: "/health" },
] as const satisfies readonly NitroRuntimeTarget[];

const nitroProbe = [
  "const [entryUrl, pathname, name] = process.argv.slice(1);",
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
  "      await response.body?.cancel();",
  "      if (response.status === 200) process.exit(0);",
  '      lastFailure = "received HTTP " + response.status;',
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
  delete environment.DATABASE_LOCAL_URL;
  return {
    ...environment,
    ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001",
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
      ],
      {
        cwd: outputDirectory,
        env: createRuntimeEnvironment(dependencies.processEnv, port),
      },
    );
    dependencies.log("info", "verify.runtime.completed", { service: target.name });
  }
}
