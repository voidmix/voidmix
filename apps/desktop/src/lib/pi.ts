import { invoke } from "@tauri-apps/api/core";
import { browserSyncOutbox } from "./sync/queue";

export type PiAvailability = "ready" | "preview" | "unavailable";
export interface PiRuntimeStatus {
  availability: PiAvailability;
  provider?: string;
  authorizedProject?: string;
  reason?: string;
}
export interface PiSession {
  id: string;
  projectPath: string;
  status: "running" | "cancelled" | "completed";
  provider: string;
}

export const PI_PREVIEW_UNAVAILABLE = "PI_PREVIEW_UNAVAILABLE";

/** Queue durable Pi lifecycle metadata; cloud upload is intentionally supplied by the caller. */
export function queuePiSyncEvent(payload: { sessionId: string; event: string; status?: string }) {
  browserSyncOutbox()?.enqueue(payload);
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getPiRuntimeStatus(): Promise<PiRuntimeStatus> {
  if (!isTauriRuntime())
    return { availability: "preview", reason: "Pi runs in the VoidMix Desktop app." };
  try {
    return await invoke<PiRuntimeStatus>("pi_runtime_status");
  } catch {
    return { availability: "unavailable", reason: "The local Pi provider is unavailable." };
  }
}

export async function authorizeProjectFolder(path: string): Promise<PiRuntimeStatus> {
  if (!isTauriRuntime())
    return { availability: "preview", reason: "Folder access is unavailable in browser preview." };
  return invoke<PiRuntimeStatus>("authorize_project_folder", { path });
}

export async function createPiSession(input: {
  projectPath?: string;
  prompt: string;
}): Promise<PiSession> {
  if (!isTauriRuntime()) throw new Error(PI_PREVIEW_UNAVAILABLE);
  const session = await invoke<PiSession>("pi_session_create", input);
  queuePiSyncEvent({ sessionId: session.id, event: "session_created", status: session.status });
  return session;
}
export async function steerPiSession(sessionId: string, message: string): Promise<PiSession> {
  if (!isTauriRuntime()) throw new Error(PI_PREVIEW_UNAVAILABLE);
  const session = await invoke<PiSession>("pi_session_steer", { sessionId, message });
  queuePiSyncEvent({ sessionId, event: "session_steered", status: session.status });
  return session;
}
export async function cancelPiSession(sessionId: string): Promise<PiSession> {
  if (!isTauriRuntime()) throw new Error(PI_PREVIEW_UNAVAILABLE);
  const session = await invoke<PiSession>("pi_session_cancel", { sessionId });
  queuePiSyncEvent({ sessionId, event: "session_cancelled", status: session.status });
  return session;
}
