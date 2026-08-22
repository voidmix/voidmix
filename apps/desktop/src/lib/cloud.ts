import { selectCloudSnapshot } from "./cloud/source";
export { demoCloudSnapshot } from "./cloud/demo";
export { isCloudSnapshot } from "./cloud/validation";
export type { CloudDevice, CloudSnapshot, SyncJob } from "./cloud/types";

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const result = value / 1024 ** exponent;
  return `${result >= 100 || exponent === 0 ? result.toFixed(0) : result.toFixed(1)} ${units[exponent]}`;
}

export const loadCloudSnapshot = selectCloudSnapshot;
