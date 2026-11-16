import { afterEach, expect, test } from "bun:test"
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { delimiter, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"

import { checkEnvironment, findNode } from "../src/commands/doctor"
import { initializeDeploymentEnv, initializeEnv } from "../src/commands/env"
import { manageDeployment } from "../src/commands/deployment"
import { probeCommand, runCommand } from "../src/lib/process"
import { workspaceRoot } from "../src/lib/workspace"

const roots: string[] = []
const template = `DATABASE_URL=postgresql://user:private-password@localhost:5432/test
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=
`

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "voidmix scripts-"))
  roots.push(root)
  await writeFile(join(root, ".env.example"), template)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

test("环境初始化生成密钥、保留模板配置并设置文件权限", async () => {
  const root = await fixture()
  expect((await initializeEnv(root)).status).toBe("created")
  const env = parseEnv(await readFile(join(root, ".env"), "utf8"))
  expect(env.DATABASE_URL).toBe(parseEnv(template).DATABASE_URL)
  expect(env.BETTER_AUTH_SECRET!.length).toBeGreaterThanOrEqual(32)
  if (process.platform !== "win32")
    expect((await stat(join(root, ".env"))).mode & 0o777).toBe(0o600)
})

test("重复初始化保留已有 .env 与认证密钥", async () => {
  const root = await fixture()
  await initializeEnv(root)
  const before = await readFile(join(root, ".env"), "utf8")
  expect((await initializeEnv(root)).status).toBe("exists")
  expect(await readFile(join(root, ".env"), "utf8")).toBe(before)
})

test("并发初始化只有一个写入者，已有配置不会被覆盖", async () => {
  const root = await fixture()
  const results = await Promise.all([initializeEnv(root), initializeEnv(root)])
  expect(results.map((result) => result.status).sort()).toEqual(["created", "exists"])
  const env = parseEnv(await readFile(join(root, ".env"), "utf8"))
  expect(env.BETTER_AUTH_SECRET!.length).toBeGreaterThanOrEqual(32)
})

test("env:init 的预览不创建文件", async () => {
  const root = await fixture()
  expect((await initializeEnv(root, true)).status).toBe("planned")
  expect(await Bun.file(join(root, ".env")).exists()).toBe(false)
})

test("bootstrap commands work from a source checkout without installed dependencies", async () => {
  const root = await fixture()
  const source = fileURLToPath(new URL("../src", import.meta.url))
  const destination = join(root, "packages/scripts/src")
  await cp(source, destination, { recursive: true })
  const child = Bun.spawn(
    [process.execPath, join(destination, "index.ts"), "env:init", "--dry-run", "--json"],
    {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    },
  )
  const [code, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(error).toBe("")
  expect(code).toBe(0)
  expect(JSON.parse(output)).toEqual({
    status: "planned",
    file: join(await realpath(root), ".env"),
  })
  expect(await Bun.file(join(root, ".env")).exists()).toBe(false)
})

test("部署初始化生成独立且适用于连接 URL 的密钥，重复运行保留配置", async () => {
  const root = await fixture()
  await mkdir(join(root, "deploy"))
  await copyFile(join(workspaceRoot, "deploy/.env.example"), join(root, "deploy/.env.example"))
  expect((await initializeDeploymentEnv(root, true)).status).toBe("planned")
  expect(await Bun.file(join(root, "deploy/.env")).exists()).toBe(false)
  expect((await initializeDeploymentEnv(root)).status).toBe("created")
  const before = await readFile(join(root, "deploy/.env"), "utf8")
  const env = parseEnv(before)
  const values = [
    "BETTER_AUTH_SECRET",
    "POSTGRES_PASSWORD",
    "REDIS_PASSWORD",
    "S3_SECRET_ACCESS_KEY",
  ].map((key) => env[key]!)
  expect(new Set(values).size).toBe(4)
  for (const value of values) {
    expect(value.length).toBeGreaterThanOrEqual(32)
    expect(encodeURIComponent(value)).toBe(value)
  }
  expect((await initializeDeploymentEnv(root)).status).toBe("exists")
  expect(await readFile(join(root, "deploy/.env"), "utf8")).toBe(before)
})

test("部署使用独立配置，停止计划保留数据卷，未初始化时不执行命令", async () => {
  const root = await fixture()
  const plan = await manageDeployment("down", root, true)
  expect(plan.commands[0]).toContain(join(root, "deploy/.env"))
  expect(plan.commands[0]).toContain(join(root, "compose.deploy.yaml"))
  expect(plan.commands[0]).toContain("stop")
  expect(plan.commands[0]).not.toContain("--volumes")
  const backup = await manageDeployment("backup", root, true)
  expect(backup.commands[0]!.slice(-3)).toEqual(["run", "--rm", "backup"])
  await expect(manageDeployment("up", root)).rejects.toThrow("docker:init")
})

test("配置检查识别缺失和错误配置，报告不含凭据", async () => {
  const root = await fixture()
  await initializeEnv(root)
  const env = parseEnv(await readFile(join(root, ".env"), "utf8"))
  const valid = await checkEnvironment(root, {})
  expect(valid.every((check) => check.ok)).toBe(true)
  const invalid = await checkEnvironment(root, {
    DATABASE_URL: "https://user:private-password@example.com",
    BETTER_AUTH_SECRET: "short-secret",
    S3_BUCKET: "example",
  })
  expect(invalid.filter((check) => !check.ok)).toHaveLength(3)
  const report = JSON.stringify([...valid, ...invalid])
  for (const secret of [env.BETTER_AUTH_SECRET!, "private-password", "short-secret"]) {
    expect(report).not.toContain(secret)
  }
})

test.skipIf(process.platform === "win32")("工具链检查跳过 Bun 的 node 兼容入口", async () => {
  const root = await fixture()
  const shim = join(root, "shim")
  const native = join(root, "native")
  await Promise.all([mkdir(shim), mkdir(native)])
  await symlink(process.execPath, join(shim, "node"))
  const candidate = join(native, "node")
  await writeFile(candidate, "#!/bin/sh\nexit 0\n", { mode: 0o755 })
  expect(await findNode(shim)).toBeNull()
  expect(await findNode([shim, native].join(delimiter))).toBe(candidate)
})

test("子进程以独立 argv 传递空格和 shell 字符", async () => {
  const root = await fixture()
  const file = join(root, "arguments with spaces.txt")
  const literal = "$(echo not-a-shell); text with spaces"
  await runCommand(
    [process.execPath, "-e", "await Bun.write(process.argv[1], process.argv[2])", file, literal],
    { cwd: root },
  )
  expect(await readFile(file, "utf8")).toBe(literal)
})

test("子命令保留失败退出码，诊断探测会中止超时进程", async () => {
  await expect(runCommand([process.execPath, "-e", "process.exit(17)"])).rejects.toMatchObject({
    exitCode: 17,
  })
  const probe = await probeCommand([process.execPath, "-e", "setInterval(() => {}, 1000)"], {
    timeout: 50,
  })
  expect(probe.ok).toBe(false)
})

test("从其他目录运行 services:down 预览仍定位当前仓库，且只计划 stop", async () => {
  const root = await fixture()
  const entry = fileURLToPath(new URL("../src/index.ts", import.meta.url))
  const child = Bun.spawn([process.execPath, entry, "services:down", "--dry-run", "--json"], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, FORCE_COLOR: "1" },
  })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(code).toBe(0)
  expect(stderr).toBe("")
  const plan = JSON.parse(stdout) as { cwd: string; commands: string[][] }
  expect(plan.cwd).toBe(workspaceRoot)
  expect(plan.commands).toHaveLength(1)
  const [command] = plan.commands
  expect(command).toContain(join(workspaceRoot, "compose.yaml"))
  expect(command).toContain("stop")
  for (const destructive of ["down", "rm", "--volumes", "--rmi"]) {
    expect(command).not.toContain(destructive)
  }
  expect(await Bun.file(join(root, ".env")).exists()).toBe(false)
})
