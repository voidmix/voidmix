import { createApiClient } from "@voidmix/client";
import type { CloudSnapshot } from "./types";
import { isCloudSnapshot } from "./validation";

export type RemoteSnapshotResult =
  | { kind: "loaded"; snapshot: CloudSnapshot }
  | { kind: "invalid_snapshot" }
  | { kind: "overview_unavailable" }
  | { kind: "health_check_failed" };

export async function fetchRemoteSnapshot(apiUrl: string): Promise<RemoteSnapshotResult> {
  const baseUrl = apiUrl.replace(/\/$/, "");
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 3500);

  try {
    let client: ReturnType<typeof createApiClient>;
    try {
      client = createApiClient({ baseUrl });
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
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Cloud API returned ${response.status}`);
      const data: unknown = await response.json();
      if (!isCloudSnapshot(data)) return { kind: "invalid_snapshot" };
      return { kind: "loaded", snapshot: data };
    } catch {
      return { kind: "overview_unavailable" };
    }
  } finally {
    globalThis.clearTimeout(timer);
  }
}
