import { createApiClient } from "@voidmix/client";
import { getDesktopLocaleHeaders } from "../../i18n/client";
import type { CloudSnapshot } from "./types";
import { isCloudSnapshot } from "./validation";

export type RemoteSnapshotResult =
  | { kind: "loaded"; snapshot: CloudSnapshot }
  | { kind: "invalid_snapshot" }
  | { kind: "overview_unavailable" }
  | { kind: "health_check_failed" };

type SnapshotDetail = CloudSnapshot["jobs"][number]["detail"];

export async function fetchRemoteSnapshot(apiUrl: string): Promise<RemoteSnapshotResult> {
  const baseUrl = apiUrl.replace(/\/$/, "");
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 3500);

  try {
    let client: ReturnType<typeof createApiClient>;
    try {
      client = createApiClient({ baseUrl, headers: getDesktopLocaleHeaders });
    } catch {
      return { kind: "health_check_failed" };
    }

    try {
      await client.health({});
    } catch {
      return { kind: "health_check_failed" };
    }

    try {
      const response = await fetch(`${baseUrl}/desktop/overview`, {
        headers: { ...getDesktopLocaleHeaders(), accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Cloud API returned ${response.status}`);
      const data: unknown = await response.json();
      const snapshot = normalizeSnapshot(data);
      if (!snapshot || !isCloudSnapshot(snapshot)) return { kind: "invalid_snapshot" };
      return { kind: "loaded", snapshot };
    } catch {
      return { kind: "overview_unavailable" };
    }
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export function normalizeSnapshot(value: unknown, now = new Date()): CloudSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const parseDate = (candidate: unknown): Date | null => {
    if (candidate instanceof Date) return Number.isFinite(candidate.valueOf()) ? candidate : null;
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate)) return null;
      // Older payloads occasionally used Unix seconds while JSON APIs usually
      // send milliseconds. Distinguish them by their practical magnitude.
      const timestamp = Math.abs(candidate) < 1e12 ? candidate * 1000 : candidate;
      const date = new Date(timestamp);
      return Number.isFinite(date.valueOf()) ? date : null;
    }
    if (typeof candidate !== "string") return null;
    const value = candidate.trim();
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isFinite(parsed.valueOf())) return parsed;
    return parseRelativeDate(value, now);
  };
  const parseCount = (candidate: unknown): number | null =>
    typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0
      ? candidate
      : null;
  const parseNumber = (candidate: unknown): number | null =>
    typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0
      ? candidate
      : null;
  const lastChecked = parseDate(input.lastChecked);
  const lastBackup = parseDate(input.lastBackup);
  const pendingItems = parseCount(input.pendingItems);
  const fileCount = parseCount(input.fileCount);
  const newThisWeek = parseCount(input.newThisWeek);
  if (
    !lastChecked ||
    !lastBackup ||
    pendingItems === null ||
    fileCount === null ||
    newThisWeek === null ||
    !Array.isArray(input.jobs) ||
    !Array.isArray(input.devices)
  )
    return null;

  const storage = normalizeStorage(input.storage, parseNumber);
  if (!storage) return null;

  const jobs = input.jobs.map((job) => {
    if (!job || typeof job !== "object") return null;
    const candidate = job as Record<string, unknown>;
    const id = typeof candidate.id === "string" && candidate.id.length > 0 ? candidate.id : null;
    const name =
      typeof candidate.name === "string" && candidate.name.length > 0 ? candidate.name : null;
    const kind =
      candidate.kind === "upload" || candidate.kind === "download" || candidate.kind === "index"
        ? candidate.kind
        : null;
    const status =
      candidate.status === "active" ||
      candidate.status === "queued" ||
      candidate.status === "complete"
        ? candidate.status
        : null;
    const progress =
      typeof candidate.progress === "number" &&
      Number.isFinite(candidate.progress) &&
      candidate.progress >= 0 &&
      candidate.progress <= 100
        ? candidate.progress
        : null;
    const detail = normalizeDetail(candidate.detail, parseCount, parseNumber);
    return id && name && kind && status && progress !== null && detail
      ? { id, name, kind, status, progress, detail }
      : null;
  });
  const devices = input.devices.map((device) => {
    if (!device || typeof device !== "object") return null;
    const candidate = device as Record<string, unknown>;
    const id = typeof candidate.id === "string" && candidate.id.length > 0 ? candidate.id : null;
    const name =
      typeof candidate.name === "string" && candidate.name.length > 0 ? candidate.name : null;
    const platform =
      typeof candidate.platform === "string" && candidate.platform.length > 0
        ? candidate.platform
        : null;
    const kind =
      candidate.kind === "desktop" || candidate.kind === "laptop" || candidate.kind === "phone"
        ? candidate.kind
        : null;
    const online = typeof candidate.online === "boolean" ? candidate.online : null;
    const lastSeen = parseDate(candidate.lastSeen);
    const syncedBytes =
      candidate.syncedBytes === undefined
        ? parseHumanSize(candidate.synced)
        : parseNumber(candidate.syncedBytes);
    return id && name && platform && kind && online !== null && lastSeen && syncedBytes !== null
      ? { id, name, platform, kind, online, lastSeen, syncedBytes }
      : null;
  });
  if (jobs.some((job) => !job) || devices.some((device) => !device)) return null;
  return {
    lastChecked,
    lastBackup,
    pendingItems,
    fileCount,
    newThisWeek,
    storage,
    jobs: jobs as CloudSnapshot["jobs"],
    devices: devices as CloudSnapshot["devices"],
  };
}

function parseRelativeDate(value: string, now: Date): Date | null {
  const normalized = value.toLowerCase().replace(/\s+/gu, " ").trim();
  if (/^(?:now|just now|right now|today|刚刚|现在|今天)$/u.test(normalized)) {
    return new Date(now);
  }
  if (/^(?:yesterday|昨天)$/u.test(normalized)) {
    return new Date(now.valueOf() - 24 * 60 * 60 * 1000);
  }

  const relative = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|m|hours?|hrs?|hr|h|分钟|小时|时)\s*(?:ago|前)?$/u,
  );
  if (!relative) return null;
  const amount = Number(relative[1]);
  const unit = relative[2];
  if (!Number.isFinite(amount) || !unit) return null;
  const milliseconds = /^(?:hours?|hrs?|hr|h|小时|时)$/u.test(unit)
    ? amount * 60 * 60 * 1000
    : amount * 60 * 1000;
  const date = new Date(now.valueOf() - milliseconds);
  return Number.isFinite(date.valueOf()) ? date : null;
}

const sizeUnits = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 } as const;

function parseHumanSize(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2]?.toUpperCase() as keyof typeof sizeUnits | undefined;
  if (!Number.isFinite(amount) || !unit) return null;
  const bytes = amount * sizeUnits[unit];
  return Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
}

function normalizeDetail(
  value: unknown,
  parseCount: (value: unknown) => number | null,
  parseNumber: (value: unknown) => number | null,
): SnapshotDetail | null {
  if (value && typeof value === "object") {
    const detail = value as Record<string, unknown>;
    const count = parseCount(detail.count);
    if (count !== null && (detail.kind === "files" || detail.kind === "objects")) {
      const sizeBytes = detail.sizeBytes === undefined ? undefined : parseNumber(detail.sizeBytes);
      if (sizeBytes === null) return null;
      return {
        kind: detail.kind,
        count,
        ...(sizeBytes !== undefined ? { sizeBytes } : {}),
      };
    }
    return null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/gu, " ").trim();
  const sizePattern = String.raw`(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)`;
  const files = normalized.match(
    new RegExp(String.raw`^(\d+)\s*(?:files?|个文件)(?:\s*[·•]\s*${sizePattern})?$`, "iu"),
  );
  if (files) {
    const count = parseCount(Number(files[1]));
    if (count === null) return null;
    const sizeBytes = files[2] && files[3] ? parseHumanSize(`${files[2]} ${files[3]}`) : null;
    if (files[2] && files[3] && sizeBytes === null) return null;
    return {
      kind: "files",
      count,
      ...(sizeBytes !== null ? { sizeBytes } : {}),
    };
  }

  const objects = normalized.match(
    new RegExp(
      String.raw`^(?:(?:indexed|已索引)\s*)?(\d+)\s*(?:objects?|个(?:变更)?对象)(?:\s*(?:indexed|已索引|已编入索引))?(?:\s*[·•]\s*${sizePattern})?$`,
      "iu",
    ),
  );
  if (!objects) return null;
  const count = parseCount(Number(objects[1]));
  if (count === null) return null;
  const sizeBytes = objects[2] && objects[3] ? parseHumanSize(`${objects[2]} ${objects[3]}`) : null;
  if (objects[2] && objects[3] && sizeBytes === null) return null;
  return {
    kind: "objects",
    count,
    ...(sizeBytes !== null ? { sizeBytes } : {}),
  };
}

function normalizeStorage(
  value: unknown,
  parseNumber: (value: unknown) => number | null,
): CloudSnapshot["storage"] | null {
  if (!value || typeof value !== "object") return null;
  const storage = value as Record<string, unknown>;
  const used = parseNumber(storage.used);
  const total = parseNumber(storage.total);
  const projects = parseNumber(storage.projects);
  const media = parseNumber(storage.media);
  const archives = parseNumber(storage.archives);
  if (
    used === null ||
    total === null ||
    total <= 0 ||
    used > total ||
    projects === null ||
    media === null ||
    archives === null
  )
    return null;
  return { used, total, projects, media, archives };
}
