import z from "zod";

import {
  dictionaryToStandardSchema,
  ensureSynchronous,
  getDefaultDictionary,
  type StandardSchemaDictionary,
  type StandardSchemaV1,
} from "./standard.js";
import type {
  ClientFormat,
  DefineEnv,
  EnvOptions,
  ExtendsFormat,
  FinalSchema,
  PrefixFormat,
  Preset,
  Schema,
  ServerFormat,
  SharedFormat,
} from "./types.js";

type RuntimeEnv = Record<string, string | boolean | number | undefined>;
type RuntimePreset = Preset | Readonly<Preset>;

type ClientAccessDescriptor = {
  keys: ReadonlySet<string>;
  prefix: PrefixFormat;
};

type CompiledPresetContext = {
  clientAccess: readonly ClientAccessDescriptor[];
  schema: StandardSchemaDictionary;
  sharedKeys: ReadonlySet<string>;
};

const CLIENT_PREFIX = "VITE_";
const ignoredProperties = new Set(["__esModule", "$$typeof"]);

function getImportMetaEnv(): Record<string, string | boolean | undefined> {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as { env?: unknown }).env) {
      return (import.meta as unknown as { env: Record<string, string | boolean | undefined> }).env;
    }
  } catch {
    // Some runtimes expose import.meta without Vite's env object.
  }
  return {};
}

function getProcessEnv(): Record<string, string | undefined> {
  const runtimeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return runtimeProcess?.env ?? {};
}

function normalizeEnv(values: RuntimeEnv): RuntimeEnv {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? undefined : value,
    ]),
  );
}

function getCombinedSchema(preset: RuntimePreset, isServer: boolean): StandardSchemaDictionary {
  return {
    ...preset.shared,
    ...(isServer ? preset.server : undefined),
    ...preset.client,
  };
}

function visitPresetTree(
  preset: RuntimePreset,
  visit: (value: RuntimePreset) => void,
  stack = new Set<RuntimePreset>(),
): void {
  if (stack.has(preset)) {
    throw new EnvError(`Circular environment preset detected at "${preset.id ?? "anonymous"}".`);
  }

  stack.add(preset);
  for (const nestedPreset of preset.extends ?? []) visitPresetTree(nestedPreset, visit, stack);
  stack.delete(preset);
  visit(preset);
}

function compilePresetContext(options: RuntimePreset, isServer: boolean): CompiledPresetContext {
  const schema: StandardSchemaDictionary = {};
  const sharedKeys = new Set<string>();
  const clientAccess: ClientAccessDescriptor[] = [];

  visitPresetTree(options, (preset) => {
    Object.assign(schema, getCombinedSchema(preset, isServer));
    for (const key of Object.keys(preset.shared ?? {})) sharedKeys.add(key);
    clientAccess.push({
      keys: new Set(Object.keys(preset.client ?? {})),
      prefix: preset.clientPrefix,
    });
  });

  return { clientAccess, schema, sharedKeys };
}

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

const issuePath = (issue: StandardSchemaV1.Issue): string => {
  const [first] = issue.path ?? [];
  if (typeof first === "object" && first && "key" in first) return String(first.key);
  return first === undefined ? "unknown" : String(first);
};

function reportInvalidEnv(issues: StandardSchemaV1.FailureResult["issues"]): never {
  const details = issues.map((issue) => `${issuePath(issue)}: ${issue.message}`).join("\n");
  throw new EnvError(`Invalid environment variables:\n${details}`);
}

function rejectServerAccess(variable: string): never {
  throw new EnvError(
    `Attempted to access a server-side environment variable on the client: ${variable}`,
  );
}

function canAccessClientVariable(context: CompiledPresetContext, variable: string): boolean {
  if (context.sharedKeys.has(variable)) return true;
  return context.clientAccess.some(
    ({ keys, prefix }) => keys.has(variable) && (!prefix || variable.startsWith(prefix)),
  );
}

function createEnvProxy<Final extends Schema>(options: {
  context: CompiledPresetContext;
  finalSchema: Final;
  isServer: boolean;
  onInvalidAccess: (variable: string) => never;
  values: object;
}): DefineEnv<Final> {
  const { context, finalSchema, isServer, onInvalidAccess, values } = options;
  return new Proxy(values, {
    get(target, property, receiver) {
      if (typeof property !== "string") return Reflect.get(target, property, receiver);
      if (ignoredProperties.has(property)) return undefined;
      if (property === "_schema") return finalSchema;
      if (!isServer && !canAccessClientVariable(context, property)) onInvalidAccess(property);
      return Reflect.get(target, property, receiver);
    },
  }) as DefineEnv<Final>;
}

export function defineEnv<
  Prefix extends PrefixFormat,
  Shared extends SharedFormat = NonNullable<unknown>,
  Server extends ServerFormat = NonNullable<unknown>,
  Client extends ClientFormat = NonNullable<unknown>,
  const Extends extends ExtendsFormat = [],
  Final extends Schema = FinalSchema<Shared, Server, Client, Extends>,
>(options: EnvOptions<Prefix, Shared, Server, Client, Extends, Final>): DefineEnv<Final> {
  const isServer = options.isServer ?? detectIsServer();
  const context = compilePresetContext(options as RuntimePreset, isServer);
  const finalSchema =
    options.transform?.(context.schema as never, isServer) ??
    (dictionaryToStandardSchema(context.schema) as Final);
  const defaults = getDefaultDictionary(context.schema);
  const runtimeValues = normalizeEnv(options.runtimeEnv ?? getProcessEnv());
  const declaredValues = Object.fromEntries(
    Object.keys(context.schema).map((key) => [
      key,
      runtimeValues[key] === undefined ? defaults[key] : runtimeValues[key],
    ]),
  );

  let values: object = declaredValues;
  if (!options.skip) {
    const result = finalSchema["~standard"].validate(declaredValues);
    ensureSynchronous(result, "Environment validation must be synchronous.");
    if (result.issues) return (options.onError ?? reportInvalidEnv)(result.issues);
    values = result.value;
  }

  return createEnvProxy({
    context,
    finalSchema,
    isServer,
    onInvalidAccess: options.onInvalidAccess ?? rejectServerAccess,
    values,
  });
}

function detectIsServer(): boolean {
  if (typeof (globalThis as Record<string, unknown>).window === "undefined") return true;
  return getImportMetaEnv().SSR === true;
}

export type CreateEnvOptions<
  Shared extends SharedFormat,
  Server extends ServerFormat,
  Client extends ClientFormat,
  Extends extends ExtendsFormat,
  Final extends Schema,
> = Omit<EnvOptions<typeof CLIENT_PREFIX, Shared, Server, Client, Extends, Final>, "clientPrefix">;

export function createEnv<
  Server extends ServerFormat = NonNullable<unknown>,
  Client extends ClientFormat = NonNullable<unknown>,
  Shared extends SharedFormat = NonNullable<unknown>,
  const Extends extends ExtendsFormat = [],
  Final extends Schema = FinalSchema<Shared, Server, Client, Extends>,
>(options: CreateEnvOptions<Shared, Server, Client, Extends, Final>): DefineEnv<Final> {
  const client = typeof options.client === "object" ? options.client : {};
  const server = typeof options.server === "object" ? options.server : {};
  const isServer = options.isServer ?? detectIsServer();
  const processEnv = getProcessEnv();
  const metaEnv = getImportMetaEnv();
  const publicKeys = [...Object.keys(options.shared ?? {}), ...Object.keys(client)];
  const publicProcessEnv = Object.fromEntries(
    publicKeys.map((key) => [key, processEnv[key]]).filter(([, value]) => value !== undefined),
  );
  const runtimeMode =
    processEnv.NODE_ENV ?? (typeof metaEnv.MODE === "string" ? metaEnv.MODE : undefined);
  const runtimeEnv = isServer
    ? {
        ...processEnv,
        ...metaEnv,
        ...(runtimeMode ? { NODE_ENV: runtimeMode } : {}),
        ...options.runtimeEnv,
      }
    : {
        ...publicProcessEnv,
        ...metaEnv,
        ...(runtimeMode ? { NODE_ENV: runtimeMode } : {}),
        ...options.runtimeEnv,
      };

  return defineEnv<typeof CLIENT_PREFIX, Shared, Server, Client, Extends, Final>({
    ...options,
    client,
    server,
    isServer,
    runtimeEnv,
    clientPrefix: CLIENT_PREFIX,
  });
}

export type {
  ClientFormat,
  DefineEnv,
  EnvOptions,
  ExtendsFormat,
  FinalSchema,
  Preset,
  Schema,
  ServerFormat,
  SharedFormat,
};
export { z };
