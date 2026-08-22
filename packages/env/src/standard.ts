export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output> | undefined;
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult;

  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }

  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  export interface PathSegment {
    readonly key: PropertyKey;
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }

  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["output"];
}

export type StandardSchemaDictionary<
  Input = Record<string, unknown>,
  Output extends Record<keyof Input, unknown> = Input,
> = {
  [Key in keyof Input]-?: StandardSchemaV1<Input[Key], Output[Key]>;
};

export namespace StandardSchemaDictionary {
  export type InferOutput<Dictionary extends StandardSchemaDictionary> = {
    [Key in keyof Dictionary]: StandardSchemaV1.InferOutput<Dictionary[Key]>;
  };
}

export function ensureSynchronous<Value>(
  value: Value | Promise<Value>,
  message: string,
): asserts value is Value {
  if (value instanceof Promise) throw new Error(message);
}

export function parseWithDictionary<Dictionary extends StandardSchemaDictionary>(
  dictionary: Dictionary,
  value: Record<string, unknown>,
): StandardSchemaV1.Result<StandardSchemaDictionary.InferOutput<Dictionary>> {
  const result: Record<string, unknown> = {};
  const issues: StandardSchemaV1.Issue[] = [];

  for (const key in dictionary) {
    const propertyResult = dictionary[key]?.["~standard"].validate(value[key]);
    ensureSynchronous(
      propertyResult,
      `Environment validation must be synchronous, but ${key} returned a Promise.`,
    );

    if (propertyResult?.issues) {
      issues.push(
        ...propertyResult.issues.map((issue) => ({
          ...issue,
          path: [key, ...(issue.path ?? [])],
        })),
      );
    } else {
      result[key] = propertyResult?.value;
    }
  }

  return issues.length
    ? { issues }
    : { value: result as StandardSchemaDictionary.InferOutput<Dictionary> };
}

export function dictionaryToStandardSchema<Dictionary extends StandardSchemaDictionary>(
  dictionary: Dictionary,
): StandardSchemaV1<Record<string, unknown>, StandardSchemaDictionary.InferOutput<Dictionary>> {
  return {
    "~standard": {
      version: 1,
      vendor: "voidmix-env",
      validate(value) {
        if (!value || typeof value !== "object") {
          return { issues: [{ message: "Expected an environment object." }] };
        }
        return parseWithDictionary(dictionary, value as Record<string, unknown>);
      },
    },
  };
}

export const getDefault = (schema: StandardSchemaV1): unknown => {
  if (typeof schema !== "object" || schema === null) return undefined;

  if ("default" in schema && !["object", "function"].includes(typeof schema.default)) {
    return schema.default;
  }

  if ("_def" in schema) {
    const definition = schema._def;
    if (typeof definition === "object" && definition !== null && "defaultValue" in definition) {
      return typeof definition.defaultValue === "function"
        ? definition.defaultValue()
        : definition.defaultValue;
    }
  }

  return undefined;
};

export const getDefaultDictionary = (schema: StandardSchemaDictionary) =>
  Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, getDefault(value)]));
