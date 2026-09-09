import { previewResponseFallback } from "./fixtures";
import type { ChatMessage, ChatMessageContentValues } from "./types";

const STORAGE_KEY = "voidmix.previewChats.v2";
const LEGACY_STORAGE_KEY = "voidmix.previewChats.v1";

export interface LocalChatSession {
  id: string;
  messages: readonly ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

type SessionMap = Record<string, LocalChatSession>;

interface LegacyChatMessage {
  content: string;
  id: string;
  role: "assistant" | "user";
  timestamp: string;
}

interface LegacyChatSession {
  createdAt: string;
  id: string;
  messages: LegacyChatMessage[];
  updatedAt: string;
}

const memorySessions = new Map<string, LocalChatSession>();

function isPrimitiveValueRecord(value: unknown): value is ChatMessageContentValues {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (entry) =>
        entry === null ||
        typeof entry === "string" ||
        typeof entry === "number" ||
        typeof entry === "boolean",
    )
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChatMessage>;
  const timestamp = candidate.timestamp;
  const values = typeof timestamp === "object" && timestamp !== null ? timestamp.values : undefined;
  const validValues = values === undefined || isPrimitiveValueRecord(values);
  const contentKey = candidate.contentKey;
  const contentValues = candidate.contentValues;
  const validContent =
    contentKey === undefined && contentValues === undefined
      ? true
      : candidate.role === "assistant" &&
        contentKey === "previewResponse" &&
        (contentValues === undefined || isPrimitiveValueRecord(contentValues));
  return (
    typeof candidate.id === "string" &&
    (candidate.role === "assistant" || candidate.role === "user") &&
    typeof candidate.content === "string" &&
    typeof timestamp === "object" &&
    timestamp !== null &&
    typeof timestamp.createdAt === "string" &&
    !Number.isNaN(Date.parse(timestamp.createdAt)) &&
    (timestamp.kind === "now" || timestamp.kind === "preview" || timestamp.kind === "date") &&
    validValues &&
    validContent
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
    !Number.isNaN(Date.parse(candidate.createdAt)) &&
    typeof candidate.updatedAt === "string" &&
    !Number.isNaN(Date.parse(candidate.updatedAt))
  );
}

function isLegacyChatMessage(value: unknown): value is LegacyChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LegacyChatMessage>;
  return (
    typeof candidate.id === "string" &&
    (candidate.role === "assistant" || candidate.role === "user") &&
    typeof candidate.content === "string" &&
    typeof candidate.timestamp === "string"
  );
}

function isLegacyChatSession(value: unknown): value is LegacyChatSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LegacyChatSession>;
  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.messages) &&
    candidate.messages.every(isLegacyChatMessage) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function parseDate(value: string): string | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function migrateLegacyMessage(message: LegacyChatMessage, fallbackCreatedAt: string): ChatMessage {
  const createdAt = parseDate(message.timestamp) ?? fallbackCreatedAt;
  const kind = parseDate(message.timestamp)
    ? "date"
    : message.role === "assistant"
      ? "preview"
      : "now";
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    ...(message.role === "assistant" && message.content === previewResponseFallback
      ? { contentKey: "previewResponse" as const }
      : {}),
    timestamp: { createdAt, kind },
  };
}

function migrateLegacySessions(value: unknown): SessionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const migrated: SessionMap = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!isLegacyChatSession(candidate)) continue;
    const createdAt = parseDate(candidate.createdAt) ?? parseDate(candidate.updatedAt);
    const updatedAt = parseDate(candidate.updatedAt) ?? createdAt;
    if (!createdAt || !updatedAt) continue;
    migrated[key] = {
      id: candidate.id,
      createdAt,
      updatedAt,
      messages: candidate.messages.map((message) => migrateLegacyMessage(message, createdAt)),
    };
  }
  return migrated;
}

function rememberSessions(sessions: SessionMap) {
  for (const [id, session] of Object.entries(sessions)) memorySessions.set(id, session);
}

function readSessions(): SessionMap {
  if (typeof window === "undefined") return Object.fromEntries(memorySessions);

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => isLocalChatSession(value)),
      ) as SessionMap;
    }

    const legacyRaw = window.sessionStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw === null) return {};
    const migrated = migrateLegacySessions(JSON.parse(legacyRaw));
    if (Object.keys(migrated).length === 0) return {};

    const serialized = JSON.stringify(migrated);
    window.sessionStorage.setItem(STORAGE_KEY, serialized);
    if (window.sessionStorage.getItem(STORAGE_KEY) !== serialized) {
      rememberSessions(migrated);
      return migrated;
    }
    window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    rememberSessions(migrated);
    return migrated;
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

export function listLocalChatSessions(): readonly LocalChatSession[] {
  return Object.values(readSessions()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
