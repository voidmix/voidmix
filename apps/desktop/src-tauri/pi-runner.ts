import { createInterface } from "node:readline";
import { createPiProvider, type AiProvider, type AiSession } from "@voidmix/ai";

type Request =
  | { id: string; type: "status" }
  | { id: string; type: "create"; projectId: string; cwd: string; prompt: string; title?: string }
  | { id: string; type: "steer"; sessionId: string; prompt: string }
  | { id: string; type: "cancel"; sessionId: string };

// The Tauri host keeps this JSONL process alive for the lifetime of the desktop
// runtime, so sessions can receive steer/cancel requests while a run streams.
// Production packaging should provide this runner through VOIDMIX_PI_RUNNER (or
// bundle an equivalent executable) before enabling local execution.

const cwd = process.env.VOIDMIX_PI_CWD;
const provider: AiProvider = createPiProvider({
  ...(cwd ? { cwd } : {}),
  ...(process.env.VOIDMIX_PI_AGENT_DIR ? { agentDir: process.env.VOIDMIX_PI_AGENT_DIR } : {}),
});
const sessions = new Map<string, AiSession>();

function write(value: unknown) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function handle(request: Request) {
  try {
    if (request.type === "status") {
      write({ id: request.id, ok: true, availability: "ready", provider: "pi" });
      return;
    }
    if (request.type === "create") {
      const session = await provider.createSession({
        projectId: request.projectId,
        cwd: request.cwd,
        ...(request.title ? { title: request.title } : {}),
      });
      sessions.set(session.id, session);
      write({
        id: request.id,
        ok: true,
        session: { id: session.id, projectPath: request.cwd, status: "running", provider: "pi" },
      });
      void streamRun(request.id, session, request.prompt, request.cwd);
      return;
    }
    if (request.type === "steer") {
      await provider.steer?.(request.sessionId, request.prompt);
      write({ id: request.id, ok: true });
      return;
    }
    await provider.cancel(request.sessionId);
    write({
      id: request.id,
      ok: true,
      session: { id: request.sessionId, status: "cancelled", provider: "pi" },
    });
  } catch (error) {
    write({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : "Pi runner failed",
    });
  }
}

async function streamRun(
  requestId: string,
  session: AiSession,
  prompt: string,
  projectPath: string,
) {
  const project = {
    id: session.projectId ?? "local",
    name: projectPath.split("/").pop() ?? "Project",
    description: "",
    status: "active",
    ownerId: "local",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const;
  for await (const event of provider.run({ session, project, prompt }))
    write({ id: requestId, event });
  write({ id: requestId, done: true });
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.trim()) continue;
  try {
    await handle(JSON.parse(line) as Request);
  } catch {
    write({ ok: false, error: "Invalid Pi runner request" });
  }
}
