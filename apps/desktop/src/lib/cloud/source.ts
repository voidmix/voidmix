import { log } from "@voidmix/logger/client";
import { env } from "../../env.js";
import { demoCloudSnapshot } from "./demo";
import { fetchRemoteSnapshot, type RemoteSnapshotResult } from "./remote";
import type { CloudSnapshot } from "./types";

export interface CloudLoadResult {
  snapshot: CloudSnapshot;
  source: "cloud" | "connected" | "demo";
}

export type RemoteSnapshotLoader = (apiUrl: string) => Promise<RemoteSnapshotResult>;

export async function selectCloudSnapshot(
  apiUrl = env.VITE_API_URL,
  loadRemote: RemoteSnapshotLoader = fetchRemoteSnapshot,
): Promise<CloudLoadResult> {
  if (!apiUrl) {
    log.warn({
      event: "desktop.cloud.snapshot.fallback",
      source: "demo",
      reason: "api_url_missing",
    });
    return { snapshot: demoCloudSnapshot, source: "demo" };
  }

  const result = await loadRemote(apiUrl);
  switch (result.kind) {
    case "loaded":
      log.info({
        event: "desktop.cloud.snapshot.loaded",
        source: "cloud",
      });
      return { snapshot: result.snapshot, source: "cloud" };
    case "invalid_snapshot":
      log.warn({
        event: "desktop.cloud.snapshot.fallback",
        source: "connected",
        reason: "invalid_snapshot",
      });
      return { snapshot: demoCloudSnapshot, source: "connected" };
    case "overview_unavailable":
      log.warn({
        event: "desktop.cloud.snapshot.fallback",
        source: "connected",
        reason: "overview_unavailable",
      });
      return { snapshot: demoCloudSnapshot, source: "connected" };
    case "health_check_failed":
      log.error({
        event: "desktop.cloud.snapshot.fallback",
        source: "demo",
        reason: "health_check_failed",
      });
      return { snapshot: demoCloudSnapshot, source: "demo" };
  }
}
