import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    nitro({
      preset: "bun",
      serverEntry: "./server.ts",
      plugins: ["./src/plugins/resources.ts"],
    }),
  ],
})
