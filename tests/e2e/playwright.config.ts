import { defineConfig, devices } from "@playwright/test"
import { fileURLToPath } from "node:url"

import { apiOrigin, desktopOrigin, mobileOrigin, webOrigin } from "./environment"

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))
const databaseUrl = process.env.E2E_DATABASE_URL
// Never fall back to DATABASE_URL: setup applies migrations and tests create real accounts.
if (!databaseUrl) throw new Error("请设置 E2E_DATABASE_URL，使用独立的 PostgreSQL 测试库。")

export default defineConfig({
  testDir: "./specs",
  globalSetup: "./global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [[process.env.CI ? "github" : "list"], ["html", { open: "never" }]],
  use: {
    baseURL: webOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    // Isolated production previews make failures independent of a developer's running servers.
    {
      name: "Desktop SPA",
      command: "bun run preview:desktop",
      cwd: repoRoot,
      url: desktopOrigin,
      env: { DESKTOP_PORT: "4313" },
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    },
    {
      name: "API",
      command: "bun run start:api",
      cwd: repoRoot,
      url: `${apiOrigin}/health`,
      env: {
        NODE_ENV: "test",
        API_PORT: "4312",
        HOST: "127.0.0.1",
        CORS_ORIGINS: mobileOrigin,
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_URL: webOrigin,
        BETTER_AUTH_SECRET: "voidmix-e2e-only-secret-not-for-production-123456789",
        AUTH_TRUSTED_ORIGINS: [webOrigin, mobileOrigin, apiOrigin].join(","),
      },
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    },
    {
      name: "Web",
      command: "bun run start:web",
      cwd: repoRoot,
      url: webOrigin,
      env: { PORT: "4310", HOST: "127.0.0.1", API_ORIGIN: apiOrigin },
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    },
    {
      name: "Expo Web",
      command: "bun run preview:mobile",
      cwd: repoRoot,
      url: mobileOrigin,
      env: { MOBILE_PORT: "4311" },
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    },
  ],
  projects: [
    {
      name: "desktop-web",
      testMatch: "desktop.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: desktopOrigin },
    },
    {
      name: "chromium",
      testMatch: "web.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: "web.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "api",
      testMatch: /(?:api|auth|device)\.spec\.ts/,
    },
    {
      name: "cli",
      testMatch: "cli.spec.ts",
    },
    {
      name: "expo-web",
      testMatch: "mobile.spec.ts",
      use: { ...devices["Pixel 7"], baseURL: mobileOrigin },
    },
  ],
})
