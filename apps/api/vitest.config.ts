import { defineConfig } from "vite-plus/test/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      AUTH_URL: "http://localhost:3002",
      DATABASE_URL: "postgres://voidmix:test@example.invalid:5432/voidmix",
    },
    include: ["server/**/*.{test,spec}.{ts,tsx}"],
    coverage: { reporter: ["text", "json", "lcov"] },
  },
});
