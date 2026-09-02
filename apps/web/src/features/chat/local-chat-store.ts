import type { ChatMessage } from "./types";

const STORAGE_KEY = "voidmix.previewChats.v1";

export interface LocalChatSession {
  id: string;
  messages: readonly ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

type SessionMap = Record<string, LocalChatSession>;

const memorySessions = new Map<string, LocalChatSession>();

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChatMessage>;
  return (
    typeof candidate.id === "string" &&
    (candidate.role === "assistant" || candidate.role === "user") &&
    typeof candidate.content === "string" &&
    typeof candidate.timestamp === "string"
  );
}

function isLocalChatSession(value: unknown): value is LocalChatSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalChatSession>;
  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.messages) &&
    candidate.messages.every(isChatMessage) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function readSessions(): SessionMap {
  if (typeof window === "undefined") return Object.fromEntries(memorySessions);

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isLocalChatSession(value)),
    ) as SessionMap;
  } catch {
    return {};
  }
}

function writeSessions(sessions: SessionMap) {
  for (const [id, session] of Object.entries(sessions)) {
    memorySessions.set(id, session);
  }

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Private browsing and storage quotas should not prevent a local preview
    // from continuing in the current runtime.
  }
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `preview-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createLocalChatSession(messages: readonly ChatMessage[]): string {
  const id = createSessionId();
  const now = new Date().toISOString();
  const session: LocalChatSession = { id, messages, createdAt: now, updatedAt: now };
  writeSessions({ ...readSessions(), [id]: session });
  return id;
}

export function readLocalChatSession(id: string): LocalChatSession | null {
  if (typeof window !== "undefined") return readSessions()[id] ?? null;
  return memorySessions.get(id) ?? null;
}

export function updateLocalChatSession(id: string, messages: readonly ChatMessage[]) {
  const current = readLocalChatSession(id);
  if (!current) return;

  writeSessions({
    ...readSessions(),
    [id]: { ...current, messages, updatedAt: new Date().toISOString() },
  });
}

export function localChatStorageKey() {
  return STORAGE_KEY;
}
