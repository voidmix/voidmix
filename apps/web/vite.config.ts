import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import evlog from "@voidmix/logger/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins:
    lazyPlugins(() => [
      evlog({
        service: "web",
      }),
      nitro({
        compatibilityDate: "2026-08-23",
        devServer: { hostname: "localhost" },
        plugins: ["./src/server/api/lifecycle.ts"],
        preset: "node-server",
        routes: {
          "/api/auth/**": {
            handler: "./src/server/api/handler.ts",
            format: "web",
          },
          "/rpc/**": { handler: "./src/server/api/handler.ts", format: "web" },
          "/health": { handler: "./src/server/api/handler.ts", format: "web" },
        },
        serverDir: false,
        serverEntry: false,
        traceDeps: ["react"],
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ]) ?? [],
  server: { port: 3000, strictPort: true },
});

export default config;
