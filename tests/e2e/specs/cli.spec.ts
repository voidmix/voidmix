import { expect, test } from "@playwright/test"
import { execFile } from "node:child_process"
import { once } from "node:events"
import { createServer } from "node:http"
import { fileURLToPath } from "node:url"

import { version } from "../../../apps/cli/package.json"
import { apiOrigin } from "../environment"

const entry = fileURLToPath(new URL("../../../apps/cli/dist/voidmix.js", import.meta.url))

function cli(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    execFile(
      "bun",
      [entry, ...args],
      {
        env: { ...process.env, VOIDMIX_API_URL: apiOrigin, ...env },
        timeout: 10_000,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== "number") {
          reject(error)
          return
        }
        resolve({ code: typeof error?.code === "number" ? error.code : 0, stdout, stderr })
      },
    )
  })
}

test("CLI 帮助和版本在未配置 API 时可用", async () => {
  const help = await cli(["--help"], { VOIDMIX_API_URL: "invalid" })
  expect(help.code).toBe(0)
  expect(help.stdout).toContain("greet <name>")
  expect(help.stderr).toBe("")
  const result = await cli(["--version", "--json"], { VOIDMIX_API_URL: "invalid" })
  expect(result.code).toBe(0)
  expect(JSON.parse(result.stdout)).toEqual({ version })
})

test("CLI 通过环境变量和命令参数检查真实 API", async () => {
  for (const args of [
    ["health", "--json"],
    ["health", "--json", "--api-url", apiOrigin],
  ]) {
    const result = await cli(args, args.includes("--api-url") ? { VOIDMIX_API_URL: "invalid" } : {})
    expect(result.code).toBe(0)
    expect(result.stderr).toBe("")
    expect(JSON.parse(result.stdout)).toEqual({ status: "ok" })
  }
})

test("CLI 通过共享 oRPC 客户端调用真实 API", async () => {
  const result = await cli(["greet", "  命令行  ", "--json"])
  expect(result.code).toBe(0)
  expect(result.stderr).toBe("")
  expect(JSON.parse(result.stdout)).toEqual({ message: "你好，命令行！这条消息来自 oRPC。" })
})

for (const args of [
  ["unknown"],
  ["health", "--unknown"],
  ["greet", "   "],
  ["health", "--timeout", "0"],
  ["health", "--api-url", "https://user:secret@example.com"],
]) {
  test(`CLI 参数错误返回退出码 2：${args.join(" ")}`, async () => {
    const result = await cli([...args, "--json"])
    expect(result.code).toBe(2)
    expect(result.stdout).toBe("")
    expect(JSON.parse(result.stderr)).toMatchObject({ error: expect.any(String) })
  })
}

test("CLI 连接失败返回退出码 1，错误只写入 stderr", async () => {
  const result = await cli(["health", "--api-url", "http://127.0.0.1:1", "--json"])
  expect(result.code).toBe(1)
  expect(result.stdout).toBe("")
  expect(JSON.parse(result.stderr)).toMatchObject({ error: expect.any(String) })
})

test("CLI 在配置的请求超时后退出", async () => {
  const server = createServer(() => {}).listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("测试 HTTP 服务没有监听 TCP 端口")
  try {
    const result = await cli([
      "health",
      "--api-url",
      `http://127.0.0.1:${address.port}`,
      "--timeout",
      "50",
      "--json",
    ])
    expect(result.code).toBe(1)
    expect(result.stdout).toBe("")
    expect(JSON.parse(result.stderr)).toMatchObject({ error: expect.any(String) })
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
