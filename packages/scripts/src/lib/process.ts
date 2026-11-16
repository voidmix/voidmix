export type Command = readonly [string, ...string[]]

export class CommandError extends Error {
  constructor(
    public readonly exitCode: number,
    executable: string,
  ) {
    super(`${executable} failed with exit code ${exitCode}.`)
  }
}

export async function runCommand(command: Command, options: { cwd?: string } = {}) {
  // Keep argv separate: spaces and shell metacharacters are literal arguments.
  const child = Bun.spawn([...command], {
    cwd: options.cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  const code = await child.exited
  if (code !== 0) throw new CommandError(code, command[0])
}

export async function probeCommand(
  command: Command,
  options: { cwd?: string; timeout?: number } = {},
) {
  try {
    const child = Bun.spawn([...command], {
      cwd: options.cwd,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      timeout: options.timeout ?? 5000,
      killSignal: "SIGKILL",
    })
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    return { ok: code === 0, output: (stdout || stderr).trim() }
  } catch {
    return { ok: false, output: "Command unavailable." }
  }
}
