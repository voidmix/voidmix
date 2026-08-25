import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const webUrl = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "on-first-retry",
    // These specs locate elements by visible English text, and the application
    // negotiates its locale from Accept-Language. Pin it so the assertions do
    // not depend on the machine's language.
    locale: "en-US",
  },
  projects: [
    {
      name: "web",
      testMatch: /web\.spec\.ts/,
      use: { baseURL: webUrl },
    },
    {
      name: "admin",
      testMatch: /admin\.spec\.ts/,
      use: { baseURL: webUrl },
    },
  ],
  webServer: [
    {
      command: "bun run --cwd apps/web dev -- --host 127.0.0.1",
      cwd: repositoryRoot,
      env: {
        ALLOWED_ORIGINS: webUrl,
        AUTH_SECRET: "e2e-only-secret-that-is-long-enough-for-better-auth",
        AUTH_URL: webUrl,
        DATABASE_URL:
          process.env.DATABASE_URL ?? "postgres://voidmix:e2e@example.invalid:5432/voidmix",
        NODE_ENV: "test",
      },
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
