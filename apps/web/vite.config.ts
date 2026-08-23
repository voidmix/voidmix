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
      tailwindcss(),
      tanstackStart(),
      nitro({ preset: "node-server", traceDeps: ["react"] }),
      viteReact(),
    ]) ?? [],
  server: { port: 3000, strictPort: true },
});

export default config;
