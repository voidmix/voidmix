export class UsageError extends Error {}

export interface CommandOptions {
  apiUrl: string
  timeout: number
}

export function resolveOptions(apiUrl?: string, timeout = "5000"): CommandOptions {
  let url: URL
  try {
    url = new URL(apiUrl ?? process.env.VOIDMIX_API_URL ?? "http://127.0.0.1:3002")
  } catch {
    throw new UsageError("API 地址必须是有效的 HTTP(S) URL。")
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new UsageError("API 地址必须是 HTTP(S) URL，不能包含凭据、查询参数或片段。")
  }
  const milliseconds = Number(timeout)
  if (
    !/^\d+$/.test(timeout) ||
    !Number.isSafeInteger(milliseconds) ||
    milliseconds < 1 ||
    milliseconds > 120_000
  ) {
    throw new UsageError("--timeout 必须是 1 到 120000 之间的整数毫秒。")
  }
  return { apiUrl: url.href.replace(/\/+$/, ""), timeout: milliseconds }
}
