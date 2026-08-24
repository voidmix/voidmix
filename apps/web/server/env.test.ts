import { createEnv } from "@voidmix/env";
import { describe, expect, it } from "vite-plus/test";

import { webServerEnv } from "./env.js";

describe("Web server environment", () => {
  it("uses the Web origin and keeps API runtime values server-side", () => {
    const env = createEnv({
      ...webServerEnv,
      isServer: true,
      runtimeEnv: {
        NODE_ENV: "test",
        DATABASE_URL: "postgres://voidmix:test@example.invalid:5432/voidmix",
      },
    });

    expect(env.AUTH_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toBe("postgres://voidmix:test@example.invalid:5432/voidmix");
  });
});
