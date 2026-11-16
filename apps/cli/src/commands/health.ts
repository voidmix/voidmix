import type { CommandOptions } from "../lib/config"

export async function health(options: CommandOptions) {
  const response = await fetch(`${options.apiUrl}/health`, {
    signal: AbortSignal.timeout(options.timeout),
    redirect: "error",
  })
  if (!response.ok) throw new Error(`API 健康检查失败（HTTP ${response.status}）。`)
  const data: unknown = await response.json()
  if (!data || typeof data !== "object" || !("status" in data) || data.status !== "ok") {
    throw new Error("API 健康检查返回了无效响应。")
  }
  return { status: "ok" } as const
}
