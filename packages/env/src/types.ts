import type { SetOptional, Simplify, Writable } from "type-fest";

import type { StandardSchemaDictionary, StandardSchemaV1 } from "./standard.js";

type Impossible<Value extends object> = Partial<Record<keyof Value, never>>;
type Merge<Left, Right> = Omit<Left, keyof Right> & Right;
type AsDictionary<Value> = Value extends object
  ? StandardSchemaDictionary<object, object> & Value
  : StandardSchemaDictionary<object, object>;

type PossiblyUndefinedKeys<Value> = {
  [Key in keyof Value]: undefined extends Value[Key] ? Key : never;
}[keyof Value];

type UndefinedOptional<Value> = SetOptional<Value, PossiblyUndefinedKeys<Value>>;

type ExtractExtendsArray<Value> = Value extends { extends?: infer Extends }
  ? Extends extends ExtendsFormat
    ? Extends
    : []
  : [];

type ExtractOwnSchema<Value> = CombinedSchema<
  Value extends { shared: infer Shared }
    ? Shared extends SharedFormat
      ? Shared
      : StandardSchemaDictionary<object, object>
    : StandardSchemaDictionary<object, object>,
  Value extends { server: infer Server }
    ? Server extends ServerFormat
      ? Server
      : StandardSchemaDictionary<object, object>
    : StandardSchemaDictionary<object, object>,
  Value extends { client: infer Client }
    ? Client extends ClientFormat
      ? Client
      : StandardSchemaDictionary<object, object>
    : StandardSchemaDictionary<object, object>
>;

type ExtractCombinedSchema<Value> = CombinedSchema<
  AsDictionary<Reduce<ExtractExtendsArray<Value>>>,
  AsDictionary<ExtractOwnSchema<Value>>
>;

type Reduce<
  Values extends readonly unknown[] | unknown[],
  Accumulator extends StandardSchemaDictionary<object, object> = StandardSchemaDictionary<
    object,
    object
  >,
> = Values extends readonly [infer Head, ...infer Tail] | [infer Head, ...infer Tail]
  ? Tail extends readonly unknown[] | unknown[]
    ? Writable<
        Reduce<
          Tail,
          CombinedSchema<AsDictionary<Accumulator>, AsDictionary<ExtractCombinedSchema<Head>>>
        >
      >
    : Accumulator
  : Accumulator;

export type PrefixFormat = string | undefined;
export type SharedFormat = StandardSchemaDictionary<object, object>;
export type ServerFormat = StandardSchemaDictionary<object, object>;
export type ClientFormat = StandardSchemaDictionary<object, object>;
export type Schema = StandardSchemaV1<object, object>;
export type ExtendsFormat = readonly (Preset | Readonly<Preset>)[];

export type CombinedSchema<
  Shared extends SharedFormat = SharedFormat,
  Server extends ServerFormat = ServerFormat,
  Client extends ClientFormat = ClientFormat,
> = StandardSchemaDictionary<object, object> & Merge<Shared, Merge<Server, Client>>;

export interface BaseOptions<Extends extends ExtendsFormat> {
  extends?: Extends;
  skip?: boolean;
  isServer?: boolean;
  onError?: (issues: StandardSchemaV1.FailureResult["issues"]) => never;
  onInvalidAccess?: (variable: string) => never;
}

export interface RuntimeOptions {
  runtimeEnv?: Record<string, string | boolean | number | undefined>;
}

export interface SharedOptions<Shared extends SharedFormat> {
  shared?: Shared;
}

export interface ClientOptions<Prefix extends PrefixFormat, Client extends ClientFormat> {
  clientPrefix?: Prefix;
  client?: Partial<{
    [Key in keyof Client]: Key extends `${Prefix}${string}`
      ? Client[Key]
      : `${Key extends string ? Key : never} is not prefixed with ${Prefix}.`;
  }>;
}

export interface ServerOptions<Prefix extends PrefixFormat, Server extends ServerFormat> {
  server: Partial<{
    [Key in keyof Server]: Prefix extends undefined | ""
      ? Server[Key]
      : Key extends `${Prefix}${string}`
        ? `${Key extends string ? Key : never} must not use the client prefix ${Prefix}.`
        : Server[Key];
  }>;
}

export type ValidationOptions<
  Prefix extends PrefixFormat = PrefixFormat,
  Shared extends SharedFormat = SharedFormat,
  Server extends ServerFormat = ServerFormat,
  Client extends ClientFormat = ClientFormat,
> = (
  | (ClientOptions<Prefix, Client> & ServerOptions<Prefix, Server>)
  | (ServerOptions<Prefix, Server> & Impossible<ClientOptions<never, never>>)
  | (ClientOptions<Prefix, Client> & Impossible<ServerOptions<never, never>>)
) &
  SharedOptions<Shared>;

export interface TransformSchemaOptions<
  Shared extends SharedFormat,
  Server extends ServerFormat,
  Client extends ClientFormat,
  Extends extends ExtendsFormat,
  TransformedSchema extends Schema,
> {
  transform?: (
    shape: Simplify<FullSchemaShape<Shared, Server, Client, Extends>>,
    isServer: boolean,
  ) => TransformedSchema;
}

export type EnvOptions<
  Prefix extends PrefixFormat = PrefixFormat,
  Shared extends SharedFormat = SharedFormat,
  Server extends ServerFormat = ServerFormat,
  Client extends ClientFormat = ClientFormat,
  Extends extends ExtendsFormat = ExtendsFormat,
  Final extends Schema = Schema,
> = BaseOptions<Extends> &
  RuntimeOptions &
  ValidationOptions<Prefix, Shared, Server, Client> &
  TransformSchemaOptions<Shared, Server, Client, Extends, Final>;

export type Preset<
  Prefix extends PrefixFormat = PrefixFormat,
  Shared extends SharedFormat = SharedFormat,
  Server extends ServerFormat = ServerFormat,
  Client extends ClientFormat = ClientFormat,
  Extends extends ExtendsFormat = ExtendsFormat,
> = ValidationOptions<Prefix, Shared, Server, Client> & {
  id?: string;
  extends?: Extends;
};

export type FullSchemaShape<
  Shared extends SharedFormat,
  Server extends ServerFormat,
  Client extends ClientFormat,
  Extends extends ExtendsFormat,
> = CombinedSchema<AsDictionary<Reduce<Extends>>, CombinedSchema<Shared, Server, Client>>;

export type FinalSchema<
  Shared extends SharedFormat,
  Server extends ServerFormat,
  Client extends ClientFormat,
  Extends extends ExtendsFormat,
> = StandardSchemaV1<
  object,
  UndefinedOptional<
    StandardSchemaDictionary.InferOutput<FullSchemaShape<Shared, Server, Client, Extends>>
  >
>;

export type DefineEnv<Final extends Schema = Schema> = Simplify<
  Readonly<StandardSchemaV1.InferOutput<Final> & { _schema: Final }>
>;
