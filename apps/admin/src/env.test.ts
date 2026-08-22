import { createEnv } from "@voidmix/env";
import { describe, expect, it } from "vite-plus/test";

import { adminEnv } from "./env";

describe("admin environment boundaries", () => {
  it("uses safe defaults for the browser actor and API", () => {
    const env = createEnv({ ...adminEnv, isServer: false, runtimeEnv: { NODE_ENV: "test" } });

    expect(env.VITE_API_URL).toBe("http://localhost:3002");
    expect(env.VITE_ACTOR_ID).toBe("owner-local");
    expect(env.VITE_ACTOR_ROLE).toBe("owner");
    expect(() => Reflect.get(env, "LOG_LEVEL")).toThrow(
      "Attempted to access a server-side environment variable on the client",
    );
  });

  it("accepts explicit public values without exposing server values", () => {
    const env = createEnv({
      ...adminEnv,
      isServer: false,
      runtimeEnv: {
        NODE_ENV: "test",
        VITE_API_URL: "https://api.voidmix.test",
        VITE_ACTOR_ID: "admin-test",
        VITE_ACTOR_ROLE: "admin",
        LOG_LEVEL: "debug",
      },
    });

    expect(env.VITE_API_URL).toBe("https://api.voidmix.test");
    expect(env.VITE_ACTOR_ID).toBe("admin-test");
    expect(env.VITE_ACTOR_ROLE).toBe("admin");
    expect(() => Reflect.get(env, "LOG_LEVEL")).toThrow(
      "Attempted to access a server-side environment variable on the client",
    );
  });
});
