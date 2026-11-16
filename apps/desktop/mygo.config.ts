import { defineConfig } from "mygo-cli"
import pkg from "./package.json" with { type: "json" }

export default defineConfig({
  name: "Voidmix",
  slug: "voidmix",
  identifier: "com.voidmix.app",
  version: pkg.version,
  devUrl: "http://localhost:1420",
  devCommand: "bun run dev",
  buildCommand: "bun run build",
  // Start's server output only generates the shell; the installed app embeds static assets.
  frontendDist: "dist/client",
  bindings: "src/mygo.gen.ts",
  out: "build",
  macos: {
    minimumSystemVersion: "13.3",
  },
})
