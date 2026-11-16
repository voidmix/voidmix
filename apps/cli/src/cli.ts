import { parseArgs } from "node:util"

import { version } from "../package.json"
import { greet } from "./commands/greet"
import { health } from "./commands/health"
import { resolveOptions, UsageError } from "./lib/config"

const help = `Voidmix CLI v${version}

用法：voidmix <command> [options]

命令：
  health           检查独立 API 的健康状态
  greet <name>     通过 oRPC 请求问候消息

选项：
  --api-url <url>  API 基础地址（默认 http://127.0.0.1:3002）
  --timeout <ms>   请求超时，1–120000 毫秒（默认 5000）
  --json           输出 JSON，错误写入 stderr
  -h, --help       显示帮助
  -v, --version    显示版本

环境变量：VOIDMIX_API_URL；--api-url 优先于环境变量。

示例：
  voidmix health --json
  voidmix greet Voidmix --api-url http://127.0.0.1:3002
`

function parse(args: string[]) {
  try {
    return parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
        json: { type: "boolean" },
        "api-url": { type: "string" },
        timeout: { type: "string" },
      },
    })
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : "命令参数无效。")
  }
}

export async function runCli(args: string[]): Promise<number> {
  let json = args.includes("--json")
  try {
    const { values, positionals } = parse(args)
    json = values.json ?? false
    if (values.help) {
      process.stdout.write(help)
      return 0
    }
    if (values.version) {
      process.stdout.write(`${json ? JSON.stringify({ version }) : version}\n`)
      return 0
    }
    const [command, ...parameters] = positionals
    if (!command) {
      process.stdout.write(help)
      return 0
    }
    if (command !== "health" && command !== "greet") {
      throw new UsageError(`未知命令：${command}。使用 --help 查看可用命令。`)
    }
    if (command === "health" && parameters.length !== 0) {
      throw new UsageError("health 不接受位置参数。")
    }
    const name = parameters[0]?.trim() ?? ""
    if (command === "greet" && (parameters.length !== 1 || !name || name.length > 80)) {
      throw new UsageError("用法：greet <name>；姓名必须为 1 到 80 个字符。")
    }
    const options = resolveOptions(values["api-url"], values.timeout)
    if (command === "health") {
      const result = await health(options)
      process.stdout.write(`${json ? JSON.stringify(result) : `API 正常：${options.apiUrl}`}\n`)
    } else {
      const result = await greet(name, options)
      process.stdout.write(`${json ? JSON.stringify(result) : result.message}\n`)
    }
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : "命令执行失败。"
    process.stderr.write(`${json ? JSON.stringify({ error: message }) : `错误：${message}`}\n`)
    return error instanceof UsageError ? 2 : 1
  }
}
