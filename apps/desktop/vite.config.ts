import type { ViteUserConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import evlog from "@voidmix/logger/vite";
import { defineI18nProject, i18nVitePlugin } from "@voidmix/i18n/build";
import { fileURLToPath } from "node:url";

const host = process.env.TAURI_DEV_HOST;
const isDevelopment = process.env.NODE_ENV !== "production";
const i18nProject = defineI18nProject({ root: fileURLToPath(new URL(".", import.meta.url)) });
const vitePlugins = [
  i18nVitePlugin(i18nProject),
  ...react(),
  tailwindcss(),
  ...evlog({
    service: "desktop",
    pretty: isDevelopment,
    minLevel: isDevelopment ? "debug" : "info",
    client: {
      service: "desktop",
      console: true,
      pretty: isDevelopment,
      minLevel: isDevelopment ? "debug" : "info",
    },
  }),
];
const config: ViteUserConfig = {
  // The plugin package and Vite+ can carry different Vite type instances.
  // Vite+ receives the same runtime plugin objects after this type boundary.
  plugins: vitePlugins as unknown as NonNullable<ViteUserConfig["plugins"]>,

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    ...(host ? { hmr: { protocol: "ws" as const, host, port: 1421 } } : {}),
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
};

export default config;
