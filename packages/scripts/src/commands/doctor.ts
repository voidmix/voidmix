import { readFile, realpath } from "node:fs/promises"
import { delimiter, join } from "node:path"
import { parseEnv } from "node:util"

import { probeCommand, type Command } from "../lib/process"

interface Check {
  name: string
  ok: boolean
  detail: string
}

export async function findNode(searchPath = process.env.PATH ?? "") {
  const runtime = await realpath(process.execPath)
  for (const directory of searchPath.split(delimiter).filter(Boolean)) {
    const candidate = Bun.which("node", { PATH: directory })
    if (candidate && (await realpath(candidate)) !== runtime) return candidate
  }
  return null
}

function atLeast(version: string, minimum: string) {
  const actual = version.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
  const required = minimum.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
  if (!actual || !required) return false
  for (let part = 1; part <= 3; part++) {
    const difference = Number(actual[part] ?? 0) - Number(required[part] ?? 0)
    if (difference !== 0) return difference > 0
  }
  return true
}

function validUrl(value: string | undefined, protocols: string[]) {
  try {
    const url = new URL(value ?? "")
    return protocols.includes(url.protocol) && Boolean(url.hostname)
  } catch {
    return false
  }
}

export async function checkEnvironment(
  root: string,
  overrides: NodeJS.ProcessEnv = process.env,
): Promise<Check[]> {
  let local: NodeJS.ProcessEnv = {}
  try {
    local = parseEnv(await readFile(join(root, ".env"), "utf8"))
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      return [{ name: "环境配置", ok: false, detail: ".env 无法读取或解析。" }]
    }
  }
  const env = { ...local, ...overrides }
  const missingS3 = ["S3_ENDPOINT", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter(
    (key) => !env[key]?.trim(),
  )
  const checks: Check[] = [
    {
      name: "PostgreSQL 配置",
      ok: validUrl(env.DATABASE_URL, ["postgres:", "postgresql:"]),
      detail: "DATABASE_URL 需要 PostgreSQL URL。",
    },
    {
      name: "认证配置",
      ok:
        validUrl(env.BETTER_AUTH_URL, ["http:", "https:"]) &&
        (env.BETTER_AUTH_SECRET?.trim().length ?? 0) >= 32,
      detail: "BETTER_AUTH_URL 需要 HTTP(S) URL；BETTER_AUTH_SECRET 至少 32 字符。",
    },
    {
      name: "Redis 配置",
      ok: !env.REDIS_URL?.trim() || validUrl(env.REDIS_URL, ["redis:", "rediss:"]),
      detail: env.REDIS_URL?.trim()
        ? "REDIS_URL 需要 redis:// 或 rediss:// URL。"
        : "未启用 Redis。",
    },
    {
      name: "S3 配置",
      ok:
        !env.S3_BUCKET?.trim() ||
        (missingS3.length === 0 && validUrl(env.S3_ENDPOINT, ["http:", "https:"])),
      detail: !env.S3_BUCKET?.trim()
        ? "未启用 S3。"
        : missingS3.length
          ? `缺少 ${missingS3.join("、")}。`
          : "S3_ENDPOINT 需要 HTTP(S) URL。",
    },
  ]
  return checks.map((check) =>
    check.ok && !check.detail.startsWith("未启用") ? { ...check, detail: "已配置。" } : check,
  )
}

export async function doctor(root: string, toolsOnly = false) {
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
    engines: { bun: string; node: string }
  }
  const goModule = await readFile(join(root, "apps/desktop/go.mod"), "utf8")
  const goMinimum = goModule.match(/^go\s+(\S+)/m)?.[1]
  if (!goMinimum) throw new Error("Go 模块未声明版本。")
  const versionCheck = async (name: string, command: Command, minimum?: string): Promise<Check> => {
    const result = await probeCommand(command, { cwd: root })
    return {
      name,
      ok: result.ok && (!minimum || atLeast(result.output, minimum)),
      detail: result.ok
        ? `${result.output}${minimum ? `（要求 ${minimum}）` : ""}`
        : "命令不可用、执行失败或超时，请检查安装与服务状态。",
    }
  }
  // bunfig's run.bun prepends a node symlink to Bun; inspect the actual Node installation.
  const node = await findNode()
  const checks: Check[] = [
    {
      name: "Bun",
      ok: atLeast(Bun.version, manifest.engines.bun),
      detail: `${Bun.version}（要求 ${manifest.engines.bun}）`,
    },
    ...(await Promise.all([
      node
        ? versionCheck("Node.js", [node, "--version"], manifest.engines.node)
        : Promise.resolve({ name: "Node.js", ok: false, detail: "未找到独立 Node.js 安装。" }),
      versionCheck("Go", ["go", "version"], goMinimum),
      versionCheck("Docker Compose", ["docker", "compose", "version", "--short"]),
      versionCheck("Docker 守护进程", ["docker", "info", "--format", "{{.ServerVersion}}"]),
    ])),
  ]
  if (!toolsOnly) checks.push(...(await checkEnvironment(root)))
  return { ok: checks.every((check) => check.ok), checks }
}
