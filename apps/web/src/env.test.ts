import { createEnv } from "@voidmix/env";
import { describe, expect, it } from "vite-plus/test";

import { webEnv } from "./env";

describe("web environment boundaries", () => {
  it("exposes public runtime values in the browser", () => {
    const env = createEnv({
      ...webEnv,
      isServer: false,
      runtimeEnv: {
        NODE_ENV: "test",
        VITE_LOG_LEVEL: "debug",
        VITE_LOG_PRETTY: "false",
      },
    });

    expect(env.NODE_ENV).toBe("test");
    expect(env.VITE_LOG_LEVEL).toBe("debug");
    expect(env.VITE_LOG_PRETTY).toBe(false);
    expect(() => Reflect.get(env, "LOG_LEVEL")).toThrow(
      "Attempted to access a server-side environment variable on the client",
    );
  });

  it("does not expose a separate browser API origin", () => {
    const env = createEnv({
      ...webEnv,
      isServer: false,
      runtimeEnv: { NODE_ENV: "test" },
    });

    expect(Object.keys(env)).not.toContain("VITE_API_URL");
  });

  it("keeps server logger values out of the browser interface", () => {
    const env = createEnv({
      ...webEnv,
      isServer: false,
      runtimeEnv: {
        NODE_ENV: "test",
        LOG_LEVEL: "warn",
        LOG_PRETTY: "true",
      },
    });

    expect(() => Reflect.get(env, "LOG_LEVEL")).toThrow(
      "Attempted to access a server-side environment variable on the client",
    );
    expect(Object.keys(env)).not.toContain("DATABASE_URL");
    expect(Object.keys(env)).not.toContain("AUTH_URL");
  });
});
