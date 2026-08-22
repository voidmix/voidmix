import { describe, expect, it } from "vite-plus/test";

import { createEnv, defineEnv, EnvError, z, type Preset } from "./index.js";
import { runtimeEnv } from "./runtime.js";

describe("env", () => {
  it("normalizes blank values without mutating the input", () => {
    const runtimeEnv = { OPTIONAL_VALUE: "  " };
    const env = defineEnv({
      server: { OPTIONAL_VALUE: z.string().optional() },
      runtimeEnv,
    });

    expect(env.OPTIONAL_VALUE).toBeUndefined();
    expect(runtimeEnv.OPTIONAL_VALUE).toBe("  ");
  });

  it("composes nested presets without a fixed type-depth limit", () => {
    const one = { shared: { ONE: z.literal("1") } } as const satisfies Preset;
    const two = { extends: [one], shared: { TWO: z.literal("2") } } as const satisfies Preset;
    const three = { extends: [two], shared: { THREE: z.literal("3") } } as const satisfies Preset;
    const four = { extends: [three], shared: { FOUR: z.literal("4") } } as const satisfies Preset;
    const env = createEnv({
      isServer: true,
      extends: [runtimeEnv, four],
      runtimeEnv: { NODE_ENV: "test", ONE: "1", TWO: "2", THREE: "3", FOUR: "4" },
    });

    expect([env.ONE, env.TWO, env.THREE, env.FOUR, env.NODE_ENV]).toEqual([
      "1",
      "2",
      "3",
      "4",
      "test",
    ]);
  });

  it("blocks server values on the client", () => {
    const env = defineEnv({
      isServer: false,
      server: { SECRET_VALUE: z.string() },
      clientPrefix: "VITE_",
      client: { VITE_PUBLIC_VALUE: z.string() },
      runtimeEnv: { SECRET_VALUE: "secret", VITE_PUBLIC_VALUE: "public" },
    });

    expect(env.VITE_PUBLIC_VALUE).toBe("public");
    expect(() => env.SECRET_VALUE).toThrow(/server-side environment variable/);
  });

  it("uses the transformed schema as the exposed final schema", () => {
    const finalSchema = z.object({ PORT: z.coerce.number().int() });
    const env = defineEnv({
      server: { PORT: z.string() },
      runtimeEnv: { PORT: "3002" },
      transform: () => finalSchema,
    });

    expect(env.PORT).toBe(3002);
    expect(env._schema).toBe(finalSchema);
  });

  it("works in a browser-like runtime without a process global", () => {
    const originalProcess = globalThis.process;
    Object.defineProperty(globalThis, "process", { configurable: true, value: undefined });

    try {
      const env = createEnv({
        isServer: false,
        client: { VITE_PUBLIC_VALUE: z.string().default("fallback") },
      });
      expect(env.VITE_PUBLIC_VALUE).toBe("fallback");
    } finally {
      Object.defineProperty(globalThis, "process", {
        configurable: true,
        value: originalProcess,
      });
    }
  });

  it("reports circular preset composition", () => {
    const circular = { id: "circular", extends: [] as Preset[] } satisfies Preset;
    circular.extends.push(circular);

    expect(() => createEnv({ isServer: true, extends: [circular] })).toThrow(EnvError);
  });
});
