import { defineConfig } from "vite-plus/test/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: { reporter: ["text", "json", "lcov"] },
  },
});
