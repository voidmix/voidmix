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
        plugins: ["./server/runtime.plugin.ts"],
        preset: "node-server",
        routes: {
          "/api/auth/**": {
            handler: "./server/app.ts",
            format: "web",
          },
          "/rpc/**": { handler: "./server/app.ts", format: "web" },
          "/health": { handler: "./server/app.ts", format: "web" },
        },
        serverDir: false,
        serverEntry: false,
        // The node-server trace must retain React for the TanStack SSR entry.
        // The runtime probe requests `/`, so removal is verified against the built artifact.
        traceDeps: ["react"],
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ]) ?? [],
  server: { port: 3000, strictPort: true },
});

export default config;
