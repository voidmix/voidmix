import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { fetchRemoteSnapshot, normalizeSnapshot } from "./remote";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("remote cloud snapshot adapter", () => {
  it("normalizes legacy display strings into locale-neutral data", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      );
      if (url.pathname === "/rpc/health") {
        return Response.json({ status: "ok", timestamp: "2026-09-09T00:00:00.000Z" });
      }
      return Response.json({
        lastChecked: "2026-09-09T00:00:00.000Z",
        lastBackup: "2026-09-08T23:52:00.000Z",
        pendingItems: 2,
        fileCount: 128,
        newThisWeek: 12,
        storage: {
          used: 2 * 1024 ** 3,
          total: 4 * 1024 ** 3,
          projects: 1,
          media: 1,
          archives: 0,
        },
        jobs: [
          {
            id: "job-1",
            name: "Campaign exports",
            detail: "18 files · 1.8 GB",
            kind: "upload",
            status: "active",
            progress: 72,
          },
          {
            id: "job-2",
            name: "Design system",
            detail: "328 objects indexed",
            kind: "index",
            status: "complete",
            progress: 100,
          },
        ],
        devices: [
          {
            id: "device-1",
            name: "Mac Studio",
            platform: "macOS",
            kind: "desktop",
            online: true,
            lastSeen: "2026-09-09T00:00:00.000Z",
            synced: "48.2 GB",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetch);

    const result = await fetchRemoteSnapshot("https://api.example.test/");

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.snapshot.lastChecked).toEqual(new Date("2026-09-09T00:00:00.000Z"));
    expect(result.snapshot.jobs[0]?.detail).toEqual({
      kind: "files",
      count: 18,
      sizeBytes: 1.8 * 1024 ** 3,
    });
    expect(result.snapshot.jobs[1]?.detail).toEqual({ kind: "objects", count: 328 });
    expect(result.snapshot.devices[0]?.syncedBytes).toBeCloseTo(48.2 * 1024 ** 3);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects non-finite and semantically invalid snapshot values", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      );
      if (url.pathname === "/rpc/health") {
        return Response.json({ status: "ok", timestamp: "2026-09-09T00:00:00.000Z" });
      }
      return Response.json({
        lastChecked: "2026-09-09T00:00:00.000Z",
        lastBackup: "2026-09-08T23:52:00.000Z",
        pendingItems: 0,
        fileCount: 1,
        newThisWeek: 0,
        storage: { used: 3, total: 2, projects: 1, media: 1, archives: 1 },
        jobs: [],
        devices: [],
      });
    });
    vi.stubGlobal("fetch", fetch);

    await expect(fetchRemoteSnapshot("https://api.example.test")).resolves.toEqual({
      kind: "invalid_snapshot",
    });
  });

  it("normalizes localized legacy dates and detail strings", () => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    const snapshot = normalizeSnapshot(
      {
        lastChecked: "刚刚",
        lastBackup: "2 hr ago",
        pendingItems: 0,
        fileCount: 0,
        newThisWeek: 0,
        storage: { used: 0, total: 1, projects: 0, media: 0, archives: 0 },
        jobs: [
          {
            id: "job-1",
            name: "索引",
            detail: "328 个对象已索引 · 0 B",
            kind: "index",
            status: "complete",
            progress: 100,
          },
          {
            id: "job-2",
            name: "上传",
            detail: "18 个文件 · 1.8 GB",
            kind: "upload",
            status: "active",
            progress: 50,
          },
        ],
        devices: [
          {
            id: "device-1",
            name: "Mac Studio",
            platform: "macOS",
            kind: "desktop",
            online: true,
            lastSeen: "8 分钟前",
            syncedBytes: 0,
          },
        ],
      },
      now,
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.lastChecked).toEqual(now);
    expect(snapshot?.lastBackup).toEqual(new Date("2026-09-09T10:00:00.000Z"));
    expect(snapshot?.jobs[0]?.detail).toEqual({
      kind: "objects",
      count: 328,
      sizeBytes: 0,
    });
    expect(snapshot?.jobs[1]?.detail).toEqual({
      kind: "files",
      count: 18,
      sizeBytes: 1.8 * 1024 ** 3,
    });
    expect(snapshot?.devices[0]?.lastSeen).toEqual(new Date("2026-09-09T11:52:00.000Z"));
  });

  it("accepts structured object details with a zero byte size", () => {
    const snapshot = normalizeSnapshot({
      lastChecked: "2026-09-09T00:00:00.000Z",
      lastBackup: "2026-09-09T00:00:00.000Z",
      pendingItems: 0,
      fileCount: 0,
      newThisWeek: 0,
      storage: { used: 0, total: 1, projects: 0, media: 0, archives: 0 },
      jobs: [
        {
          id: "job-1",
          name: "Index",
          detail: { kind: "objects", count: 0, sizeBytes: 0 },
          kind: "index",
          status: "complete",
          progress: 100,
        },
      ],
      devices: [],
    });

    expect(snapshot?.jobs[0]?.detail).toEqual({
      kind: "objects",
      count: 0,
      sizeBytes: 0,
    });
  });

  it("parses protocol relative dates independently of the host locale", () => {
    vi.spyOn(String.prototype, "toLocaleLowerCase").mockReturnValue("2 mınutes ago");

    const now = new Date("2026-09-09T12:00:00.000Z");
    const snapshot = normalizeSnapshot(
      {
        lastChecked: "2 MINUTES AGO",
        lastBackup: "2026-09-09T00:00:00.000Z",
        pendingItems: 0,
        fileCount: 0,
        newThisWeek: 0,
        storage: { used: 0, total: 1, projects: 0, media: 0, archives: 0 },
        jobs: [],
        devices: [],
      },
      now,
    );

    expect(snapshot?.lastChecked).toEqual(new Date("2026-09-09T11:58:00.000Z"));
  });

  it("rejects an invalid canonical device size instead of falling back to legacy text", () => {
    const snapshot = normalizeSnapshot({
      lastChecked: "2026-09-09T00:00:00.000Z",
      lastBackup: "2026-09-09T00:00:00.000Z",
      pendingItems: 0,
      fileCount: 0,
      newThisWeek: 0,
      storage: { used: 0, total: 1, projects: 0, media: 0, archives: 0 },
      jobs: [],
      devices: [
        {
          id: "device-1",
          name: "Mac Studio",
          platform: "macOS",
          kind: "desktop",
          online: true,
          lastSeen: "2026-09-09T00:00:00.000Z",
          syncedBytes: -1,
          synced: "5 GB",
        },
      ],
    });

    expect(snapshot).toBeNull();
  });
});
