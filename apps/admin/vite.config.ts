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
        service: "admin",
      }),
      tailwindcss(),
      tanstackStart(),
      nitro({ preset: "node-server" }),
      viteReact(),
    ]) ?? [],
  server: { port: 3001, strictPort: true },
});

export default config;
