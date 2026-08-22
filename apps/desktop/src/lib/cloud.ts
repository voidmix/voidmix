import { createApiClient } from "@voidmix/client";
import { log } from "@voidmix/logger/client";

import { env } from "../env.js";

export interface SyncJob {
  id: string;
  name: string;
  detail: string;
  kind: "upload" | "download" | "index";
  status: "active" | "queued" | "complete";
  progress: number;
}

export interface CloudDevice {
  id: string;
  name: string;
  platform: string;
  kind: "desktop" | "laptop" | "phone";
  online: boolean;
  lastSeen: string;
  synced: string;
}

export interface CloudSnapshot {
  lastChecked: string;
  lastBackup: string;
  pendingItems: number;
  fileCount: number;
  newThisWeek: number;
  storage: {
    used: number;
    total: number;
    projects: number;
    media: number;
    archives: number;
  };
  jobs: SyncJob[];
  devices: CloudDevice[];
}

const gibibyte = 1024 ** 3;

export const demoCloudSnapshot: CloudSnapshot = {
  lastChecked: "just now",
  lastBackup: "8 min ago",
  pendingItems: 2,
  fileCount: 12_846,
  newThisWeek: 184,
  storage: {
    used: 81.4 * gibibyte,
    total: 200 * gibibyte,
    projects: 42.8 * gibibyte,
    media: 27.3 * gibibyte,
    archives: 11.3 * gibibyte,
  },
  jobs: [
    {
      id: "job_1",
      name: "Campaign exports",
      detail: "18 files · 1.8 GB",
      kind: "upload",
      status: "active",
      progress: 72,
    },
    {
      id: "job_2",
      name: "Product research",
      detail: "4 files · 680 MB",
      kind: "download",
      status: "active",
      progress: 38,
    },
    {
      id: "job_3",
      name: "Design system",
      detail: "328 objects indexed",
      kind: "index",
      status: "complete",
      progress: 100,
    },
  ],
  devices: [
    {
      id: "dev_1",
      name: "Mac Studio",
      platform: "macOS 16.0",
      kind: "desktop",
      online: true,
      lastSeen: "Now",
      synced: "48.2 GB",
    },
    {
      id: "dev_2",
      name: "Surface Laptop",
      platform: "Windows 12",
      kind: "laptop",
      online: true,
      lastSeen: "Now",
      synced: "31.7 GB",
    },
    {
      id: "dev_3",
      name: "Alex’s iPhone",
      platform: "iOS 20",
      kind: "phone",
      online: false,
      lastSeen: "2 hr ago",
      synced: "1.5 GB",
    },
  ],
};

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const result = value / 1024 ** exponent;
  return `${result >= 100 || exponent === 0 ? result.toFixed(0) : result.toFixed(1)} ${units[exponent]}`;
}

function isCloudSnapshot(value: unknown): value is CloudSnapshot {
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

export async function loadCloudSnapshot(): Promise<{
  snapshot: CloudSnapshot;
  source: "cloud" | "connected" | "demo";
}> {
  const apiUrl = env.VITE_API_URL;
  if (!apiUrl) {
    log.warn({
      event: "desktop.cloud.snapshot.fallback",
      source: "demo",
      reason: "api_url_missing",
    });
    return { snapshot: demoCloudSnapshot, source: "demo" };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3500);
  try {
    const baseUrl = apiUrl.replace(/\/$/, "");
    const client = createApiClient({ baseUrl });
    await client.health({});

    try {
      const response = await fetch(`${baseUrl}/desktop/overview`, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Cloud API returned ${response.status}`);
      const data: unknown = await response.json();
      if (!isCloudSnapshot(data)) {
        log.warn({
          event: "desktop.cloud.snapshot.fallback",
          source: "connected",
          reason: "invalid_snapshot",
        });
        return { snapshot: demoCloudSnapshot, source: "connected" };
      }
      log.info({
        event: "desktop.cloud.snapshot.loaded",
        source: "cloud",
      });
      return { snapshot: data, source: "cloud" };
    } catch {
      log.warn({
        event: "desktop.cloud.snapshot.fallback",
        source: "connected",
        reason: "overview_unavailable",
      });
      return { snapshot: demoCloudSnapshot, source: "connected" };
    }
  } catch {
    log.error({
      event: "desktop.cloud.snapshot.fallback",
      source: "demo",
      reason: "health_check_failed",
    });
    return { snapshot: demoCloudSnapshot, source: "demo" };
  } finally {
    window.clearTimeout(timer);
  }
}
