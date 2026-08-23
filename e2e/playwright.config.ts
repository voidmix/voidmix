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
        NODE_ENV: "test",
        VITE_API_URL: "http://127.0.0.1:3002",
      },
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
