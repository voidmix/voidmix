import { describe, expect, it } from "vite-plus/test";
import {
  AssetDomainError,
  createAssetAdministration,
  normalizeAssetPath,
  type Asset,
  type AssetVersion,
  type AssetVersionCommitOutcome,
  type AssetRepository,
  type AssetVersionRepository,
  type SyncConflict,
  type SyncConflictRepository,
} from "./index";

function repositories() {
  const assets = new Map<string, Asset>();
  const versions = new Map<string, AssetVersion>();
  const conflicts = new Map<string, SyncConflict>();
  const assetRepository: AssetRepository = {
    async getById(id) {
      return assets.get(id) ?? null;
    },
    async getByPath({ workspaceId, path }) {
      return (
        [...assets.values()].find(
          (asset) => asset.workspaceId === workspaceId && asset.path === path,
        ) ?? null
      );
    },
    async createIfPathAvailable(asset) {
      const existing = [...assets.values()].find(
        (candidate) => candidate.workspaceId === asset.workspaceId && candidate.path === asset.path,
      );
      if (existing) return { status: "path_conflict" };
      assets.set(asset.id, asset);
      return { status: "created", asset };
    },
  };
  const versionRepository: AssetVersionRepository = {
    async getById(id) {
      return versions.get(id) ?? null;
    },
    async getByIdempotencyKey({ assetId, idempotencyKey }) {
      return (
        [...versions.values()].find(
          (version) => version.assetId === assetId && version.idempotencyKey === idempotencyKey,
        ) ?? null
      );
    },
  };
  const conflictRepository: SyncConflictRepository = {
    async getById(id) {
      return conflicts.get(id) ?? null;
    },
    async save(conflict) {
      conflicts.set(conflict.id, conflict);
    },
    async resolve(conflict) {
      const current = conflicts.get(conflict.id);
      if (!current) return { status: "not_found" };
      if (current.status === "resolved") {
        return { status: "already_resolved", conflict: current };
      }
      conflicts.set(conflict.id, conflict);
      return { status: "resolved", conflict };
    },
  };
  return {
    repositories: {
      assets: assetRepository,
      versions: versionRepository,
      conflicts: conflictRepository,
      async commitVersion({
        version,
        expectedHeadVersionId,
      }: {
        version: AssetVersion;
        expectedHeadVersionId: string | null;
      }): Promise<AssetVersionCommitOutcome> {
        const asset = assets.get(version.assetId);
        if (!asset) return { status: "not_found" as const };
        if (asset.headVersionId !== expectedHeadVersionId) {
          return { status: "head_conflict" as const, actualHeadVersionId: asset.headVersionId };
        }
        versions.set(version.id, version);
        const updated = { ...asset, headVersionId: version.id, updatedAt: version.createdAt };
        assets.set(asset.id, updated);
        return { status: "committed" as const, version, asset: updated };
      },
    },
    assets,
    versions,
    conflicts,
  };
}

const time = new Date("2026-09-08T00:00:00.000Z");

describe("asset domain", () => {
  it("normalizes paths and rejects traversal", () => {
    expect(normalizeAssetPath(" Art\\frames//hero.png ")).toBe("Art/frames/hero.png");
    expect(() => normalizeAssetPath("../secret.txt")).toThrowError(AssetDomainError);
    expect(() => normalizeAssetPath("/")).toThrowError(AssetDomainError);
  });

  it("commits an initial version and advances the asset head", async () => {
    const memory = repositories();
    let sequence = 0;
    const service = createAssetAdministration({
      repositories: memory.repositories,
      now: () => time,
      id: () => `id-${++sequence}`,
    });
    const asset = await service.create({ workspaceId: "ws-1", path: "images/hero.png" });
    const result = await service.commitVersion({
      actorId: "user-1",
      workspaceId: "ws-1",
      assetId: asset.id,
      blobHash: "0123456789abcdef",
      byteSize: 42,
      expectedHeadVersionId: null,
      parentVersionId: null,
      idempotencyKey: "upload-1",
    });
    expect(result.asset.headVersionId).toBe(result.version.id);
    expect(result.version.parentVersionId).toBeNull();
  });

  it("returns the same version for an idempotent retry", async () => {
    const memory = repositories();
    let sequence = 0;
    const service = createAssetAdministration({
      repositories: memory.repositories,
      id: () => `id-${++sequence}`,
    });
    const asset = await service.create({ workspaceId: "ws-1", path: "foo.txt" });
    const input = {
      actorId: "user-1",
      workspaceId: "ws-1",
      assetId: asset.id,
      blobHash: "0123456789abcdef",
      byteSize: 1,
      expectedHeadVersionId: null,
      parentVersionId: null,
      idempotencyKey: "same-key",
    } as const;
    const first = await service.commitVersion(input);
    const second = await service.commitVersion(input);
    expect(second.version.id).toBe(first.version.id);
    expect(memory.versions.size).toBe(1);
  });

  it("records a conflict when the observed head is stale", async () => {
    const memory = repositories();
    let sequence = 0;
    const service = createAssetAdministration({
      repositories: memory.repositories,
      id: () => `id-${++sequence}`,
    });
    const asset = await service.create({ workspaceId: "ws-1", path: "foo.txt" });
    const first = await service.commitVersion({
      actorId: "user-1",
      workspaceId: "ws-1",
      assetId: asset.id,
      blobHash: "0123456789abcdef",
      byteSize: 1,
      expectedHeadVersionId: null,
      parentVersionId: null,
      idempotencyKey: "first",
    });
    await expect(
      service.commitVersion({
        actorId: "user-2",
        workspaceId: "ws-1",
        assetId: asset.id,
        blobHash: "fedcba9876543210",
        byteSize: 2,
        expectedHeadVersionId: null,
        parentVersionId: null,
        idempotencyKey: "stale",
        localVersionId: "local-1",
      }),
    ).rejects.toMatchObject({ code: "ASSET_HEAD_CONFLICT" });
    expect([...memory.conflicts.values()]).toEqual([
      expect.objectContaining({
        expectedHeadVersionId: null,
        actualHeadVersionId: first.version.id,
        localVersionId: "local-1",
        status: "open",
      }),
    ]);
  });

  it("requires parent to match the expected head", async () => {
    const memory = repositories();
    const service = createAssetAdministration({
      repositories: memory.repositories,
      id: () => "asset-id",
    });
    const asset = await service.create({ workspaceId: "ws-1", path: "foo.txt" });
    await expect(
      service.commitVersion({
        actorId: "user-1",
        workspaceId: "ws-1",
        assetId: asset.id,
        blobHash: "0123456789abcdef",
        byteSize: 1,
        expectedHeadVersionId: null,
        parentVersionId: "wrong",
        idempotencyKey: "bad-parent",
      }),
    ).rejects.toMatchObject({ code: "ASSET_PARENT_CONFLICT" });
  });

  it("resolves an open conflict once", async () => {
    const memory = repositories();
    const service = createAssetAdministration({
      repositories: memory.repositories,
      id: () => "conflict-id",
      now: () => time,
    });
    await service.create({ workspaceId: "ws-1", path: "foo.txt" });
    const conflict = await service.recordConflict({
      workspaceId: "ws-1",
      assetId: "conflict-id",
      expectedHeadVersionId: null,
      actualHeadVersionId: "v1",
    });
    const resolved = await service.resolveConflict({ conflictId: conflict.id, actorId: "user-1" });
    expect(resolved.status).toBe("resolved");
    await expect(
      service.resolveConflict({ conflictId: conflict.id, actorId: "user-1" }),
    ).rejects.toMatchObject({ code: "ASSET_CONFLICT_ALREADY_RESOLVED" });
  });
});
