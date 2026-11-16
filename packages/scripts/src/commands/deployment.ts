import { join } from "node:path"

import { runCommand, type Command } from "../lib/process"

export type DeploymentAction = "build" | "up" | "down" | "status" | "logs"

export async function manageDeployment(action: DeploymentAction, root: string, dryRun = false) {
  const envFile = join(root, "deploy/.env")
  if (!dryRun && !(await Bun.file(envFile).exists())) {
    throw new Error("Run bun run docker:init to create deploy/.env first.")
  }
  const compose = [
    "docker",
    "compose",
    "--env-file",
    envFile,
    "--file",
    join(root, "compose.deploy.yaml"),
  ] as const
  const operations: Record<DeploymentAction, string[]> = {
    build: ["build"],
    up: ["up", "-d", "--build", "--wait", "--wait-timeout", "180"],
    down: ["stop"],
    status: ["ps", "--all"],
    logs: ["logs", "--follow", "--tail", "100"],
  }
  const command: Command = [...compose, ...operations[action]]
  if (!dryRun) await runCommand(command, { cwd: root })
  return { action, dryRun, cwd: root, commands: [command] }
}
