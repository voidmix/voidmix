import { join } from "node:path"

import { runCommand, type Command } from "../lib/process"

export type ServiceAction = "up" | "down" | "status"

export function servicePlan(action: ServiceAction, root: string): Command[] {
  const compose = ["docker", "compose", "--file", join(root, "compose.yaml")] as const
  const services = ["postgres", "redis", "s3"]
  switch (action) {
    case "up":
      return [
        [...compose, "up", "-d", "--wait", ...services],
        [process.execPath, "run", "storage:init"],
      ]
    case "down":
      return [[...compose, "stop", ...services]]
    case "status":
      return [[...compose, "ps", "--all", ...services]]
  }
}

export async function manageServices(action: ServiceAction, root: string, dryRun = false) {
  const commands = servicePlan(action, root)
  if (!dryRun) {
    for (const command of commands) await runCommand(command, { cwd: root })
  }
  return { action, dryRun, cwd: root, commands }
}
