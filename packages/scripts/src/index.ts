import { parseArgs } from "node:util"

import { doctor } from "./commands/doctor"
import { initializeEnv, initializeDeploymentEnv } from "./commands/env"
import { manageDeployment, type DeploymentAction } from "./commands/deployment"
import { manageServices, type ServiceAction } from "./commands/services"
import { CommandError } from "./lib/process"
import { workspaceRoot } from "./lib/workspace"

class UsageError extends Error {}

const help = `Voidmix repository tools

Usage: bun run repo <command> [options]

Commands:
  check             Validate workspace imports, exports, layering, and documentation
  env:init          Create .env and an auth secret; preserve existing files
  doctor            Check toolchain versions and server configuration
  services:up       Start PostgreSQL, Redis, and S3; initialize the local bucket
  services:down     Stop local infrastructure and retain volumes
  services:status   Show local infrastructure status
  docker:init       Create deployment configuration with independent secrets
  docker:build      Build Web, API, migration, and bucket-init images
  docker:up         Build and start the deployment; wait for health
  docker:down       Stop the deployment and retain volumes
  docker:status     Show deployment status
  docker:logs       Follow deployment logs
  docker:backup     Write a PostgreSQL dump of the deployment to BACKUP_DIR

Options:
  --dry-run         Preview initialization, service, or deployment operations
  --tools-only      Only check the toolchain with doctor
  --json            Emit JSON; service/deployment commands require --dry-run
  -h, --help        Show help
`

async function main() {
  const args = process.argv.slice(2)
  const json = args.includes("--json")
  try {
    let parsed
    try {
      parsed = parseArgs({
        args,
        allowPositionals: true,
        strict: true,
        options: {
          help: { type: "boolean", short: "h" },
          json: { type: "boolean" },
          "dry-run": { type: "boolean" },
          "tools-only": { type: "boolean" },
        },
      })
    } catch (error) {
      throw new UsageError(error instanceof Error ? error.message : "Invalid command arguments.")
    }
    const { values, positionals } = parsed
    const [command] = positionals
    if (values.help || !command) {
      process.stdout.write(help)
      return 0
    }
    if (positionals.length > 1) throw new UsageError("Unexpected extra positional arguments.")
    if (values["tools-only"] && command !== "doctor")
      throw new UsageError("--tools-only is only supported by doctor.")
    const dryRun = values["dry-run"] ?? false
    if (command === "check") {
      if (dryRun) throw new UsageError("check is read-only and does not accept --dry-run.")
      // Keep bootstrap commands usable before bun install; only this check needs TypeScript.
      const { checkWorkspace } = await import("./commands/workspace")
      const result = await checkWorkspace(workspaceRoot)
      process.stdout.write(
        json
          ? `${JSON.stringify(result)}\n`
          : [
              `${result.ok ? "✓" : "✗"} ${result.workspaceCount} workspaces, ${result.sourceCount} source files`,
              ...result.issues.map((issue) => `${issue.file}: ${issue.message}`),
            ].join("\n") + "\n",
      )
      return result.ok ? 0 : 1
    }
    if (command === "doctor") {
      if (dryRun) throw new UsageError("doctor is read-only and does not accept --dry-run.")
      const result = await doctor(workspaceRoot, values["tools-only"])
      process.stdout.write(
        json
          ? `${JSON.stringify(result)}\n`
          : result.checks
              .map((check) => `${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}\n`)
              .join(""),
      )
      return result.ok ? 0 : 1
    }
    if (command === "env:init" || command === "docker:init") {
      const result =
        command === "env:init"
          ? await initializeEnv(workspaceRoot, dryRun)
          : await initializeDeploymentEnv(workspaceRoot, dryRun)
      const messages = {
        exists: `Preserved existing ${result.file}.`,
        created: `Created ${result.file} with generated secrets.`,
        planned: `Would create ${result.file} from the template with generated secrets.`,
      }
      process.stdout.write(`${json ? JSON.stringify(result) : messages[result.status]}\n`)
      return 0
    }
    if (
      [
        "docker:build",
        "docker:up",
        "docker:down",
        "docker:status",
        "docker:logs",
        "docker:backup",
      ].includes(command)
    ) {
      if (json && !dryRun) throw new UsageError("Deployment --json output requires --dry-run.")
      const result = await manageDeployment(
        command.slice("docker:".length) as DeploymentAction,
        workspaceRoot,
        dryRun,
      )
      if (dryRun)
        process.stdout.write(
          json
            ? `${JSON.stringify(result)}\n`
            : `Working directory: ${result.cwd}\n${result.commands.map((command) => `$ ${command.join(" ")}`).join("\n")}\n`,
        )
      return 0
    }
    if (["services:up", "services:down", "services:status"].includes(command)) {
      if (json && !dryRun)
        throw new UsageError(
          "Service --json output requires --dry-run; use services:status for actual state.",
        )
      const result = await manageServices(
        command.slice("services:".length) as ServiceAction,
        workspaceRoot,
        dryRun,
      )
      if (dryRun)
        process.stdout.write(
          json
            ? `${JSON.stringify(result)}\n`
            : `Working directory: ${result.cwd}\n${result.commands.map((command) => `$ ${command.join(" ")}`).join("\n")}\n`,
        )
      return 0
    }
    throw new UsageError(`Unknown command: ${command}. Use --help to list commands.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed."
    process.stderr.write(`${json ? JSON.stringify({ error: message }) : `Error: ${message}`}\n`)
    return error instanceof UsageError ? 2 : error instanceof CommandError ? error.exitCode : 1
  }
}

process.exitCode = await main()
