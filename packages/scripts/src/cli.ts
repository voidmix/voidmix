#!/usr/bin/env bun
import { runMain } from "citty";

import { commandAfterSeparator } from "./arguments.js";

const rawArgs = process.argv.slice(2);

if (rawArgs[0] === "env" && rawArgs.includes("--")) {
  const { runEnvCommand } = await import("./commands/env.js");
  await runEnvCommand(commandAfterSeparator(rawArgs));
} else {
  const { rootCommand } = await import("./root.js");
  await runMain(rootCommand, { rawArgs });
}
