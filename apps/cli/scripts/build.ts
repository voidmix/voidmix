import { chmod } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const result = await Bun.build({
  entrypoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
  outdir: fileURLToPath(new URL("../dist", import.meta.url)),
  naming: "voidmix.js",
  target: "bun",
  sourcemap: "linked",
})
if (!result.success) throw new AggregateError(result.logs, "CLI 构建失败")
await chmod(fileURLToPath(new URL("../dist/voidmix.js", import.meta.url)), 0o755)
console.log("CLI 已构建到 dist/voidmix.js")
