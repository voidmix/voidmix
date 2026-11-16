/** Resolve required server configuration without including its value in errors. */
export function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`请配置服务端环境变量 ${name}。`)
  return value
}

/** An explicit empty string disables a list; only an absent value uses the fallback. */
export function envList(value: string | undefined, fallback: readonly string[] = []) {
  return value === undefined
    ? [...fallback]
    : value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
}
