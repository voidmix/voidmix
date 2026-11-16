import { randomBytes } from "node:crypto"
import { lstat, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

function hasCode(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code
}

export async function initializeEnv(root: string, dryRun = false) {
  return initializeEnvFile(root, ["BETTER_AUTH_SECRET"], dryRun)
}

export async function initializeDeploymentEnv(root: string, dryRun = false) {
  return initializeEnvFile(
    join(root, "deploy"),
    ["BETTER_AUTH_SECRET", "POSTGRES_PASSWORD", "REDIS_PASSWORD", "S3_SECRET_ACCESS_KEY"],
    dryRun,
  )
}

async function initializeEnvFile(root: string, secrets: string[], dryRun: boolean) {
  const file = join(root, ".env")
  try {
    await lstat(file)
    return { status: "exists", file } as const
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error
  }
  const template = await readFile(join(root, ".env.example"), "utf8")
  if (dryRun) return { status: "planned", file } as const
  let contents = template
  for (const key of secrets) {
    const line = `${key}=${randomBytes(32).toString("base64url")}`
    const pattern = new RegExp(`^${key}=.*$`, "gm")
    contents = pattern.test(contents)
      ? contents.replace(pattern, line)
      : `${contents.trimEnd()}\n${line}\n`
  }
  try {
    // Exclusive creation closes the race between the earlier existence check and this write.
    await writeFile(file, contents, { flag: "wx", mode: 0o600 })
  } catch (error) {
    if (!hasCode(error, "EEXIST")) throw error
    return { status: "exists", file } as const
  }
  return { status: "created", file } as const
}
