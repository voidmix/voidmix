import type { CloudSnapshot } from "./types";

export function isCloudSnapshot(value: unknown): value is CloudSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CloudSnapshot>;
  const storage = candidate.storage;
  return (
    isValidDate(candidate.lastChecked) &&
    isValidDate(candidate.lastBackup) &&
    isCount(candidate.fileCount) &&
    isCount(candidate.pendingItems) &&
    isCount(candidate.newThisWeek) &&
    Array.isArray(candidate.jobs) &&
    Array.isArray(candidate.devices) &&
    isStorage(storage) &&
    candidate.jobs.every(isSyncJob) &&
    candidate.devices.every(isCloudDevice)
  );
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.valueOf());
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isStorage(value: unknown): value is CloudSnapshot["storage"] {
  if (!value || typeof value !== "object") return false;
  const storage = value as Partial<CloudSnapshot["storage"]>;
  return (
    isNonNegativeNumber(storage.used) &&
    isNonNegativeNumber(storage.total) &&
    storage.total > 0 &&
    storage.used <= storage.total &&
    isNonNegativeNumber(storage.projects) &&
    isNonNegativeNumber(storage.media) &&
    isNonNegativeNumber(storage.archives)
  );
}

function isSyncJob(value: unknown): value is CloudSnapshot["jobs"][number] {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<CloudSnapshot["jobs"][number]>;
  const detail = job.detail;
  if (!detail || typeof detail !== "object") return false;
  const jobDetail = detail as Partial<CloudSnapshot["jobs"][number]["detail"]>;
  return (
    typeof job.id === "string" &&
    job.id.length > 0 &&
    typeof job.name === "string" &&
    job.name.length > 0 &&
    (job.kind === "upload" || job.kind === "download" || job.kind === "index") &&
    (job.status === "active" || job.status === "queued" || job.status === "complete") &&
    typeof job.progress === "number" &&
    Number.isFinite(job.progress) &&
    job.progress >= 0 &&
    job.progress <= 100 &&
    (jobDetail.kind === "files" || jobDetail.kind === "objects") &&
    isCount(jobDetail.count) &&
    (jobDetail.sizeBytes === undefined || isNonNegativeNumber(jobDetail.sizeBytes))
  );
}

function isCloudDevice(value: unknown): value is CloudSnapshot["devices"][number] {
  if (!value || typeof value !== "object") return false;
  const device = value as Partial<CloudSnapshot["devices"][number]>;
  return (
    typeof device.id === "string" &&
    device.id.length > 0 &&
    typeof device.name === "string" &&
    device.name.length > 0 &&
    typeof device.platform === "string" &&
    device.platform.length > 0 &&
    (device.kind === "desktop" || device.kind === "laptop" || device.kind === "phone") &&
    typeof device.online === "boolean" &&
    isValidDate(device.lastSeen) &&
    isNonNegativeNumber(device.syncedBytes)
  );
}
