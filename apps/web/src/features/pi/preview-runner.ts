import type { WorkspaceDataSource } from "../projects/preview-adapter";
import type { PiSessionView } from "../projects/types";

export async function runPreview(
  source: WorkspaceDataSource,
  input: PiSessionView,
  signal: AbortSignal,
  delayMs = 650,
): Promise<void> {
  let session: PiSessionView = { ...input, status: "running", steps: [], taskId: null };
  source.updateSession(session);
  try {
    for (const step of ["understand", "context", "create"] as const) {
      await pause(delayMs, signal);
      session = { ...session, steps: [...session.steps, step] };
      source.updateSession(session);
    }
    signal.throwIfAborted();
    const task = source.createTask(session.projectId, session.prompt);
    source.updateSession({ ...session, status: "completed", taskId: task.id });
  } catch {
    source.updateSession({ ...session, status: signal.aborted ? "cancelled" : "failed" });
  }
}

function pause(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    signal.addEventListener("abort", abort, { once: true });
  });
}
