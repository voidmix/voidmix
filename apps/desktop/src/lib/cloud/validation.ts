import type { CloudSnapshot } from "./types";

export function isCloudSnapshot(value: unknown): value is CloudSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CloudSnapshot>;
  return (
    typeof candidate.fileCount === "number" &&
    typeof candidate.pendingItems === "number" &&
    Array.isArray(candidate.jobs) &&
    Array.isArray(candidate.devices) &&
    typeof candidate.storage === "object" &&
    candidate.storage !== null
  );
}
