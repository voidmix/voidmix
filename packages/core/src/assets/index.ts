import { DomainError } from "../shared/errors.js";
import { defaultClock, defaultIdGenerator } from "../shared/types.js";

/**
 * Domain model for workspace assets and their immutable versions.
 *
 * This module deliberately contains no storage, transport, or framework types.
 * Adapters provide the ports below and own the transaction around a version
 * commit; the application service supplies the invariant checks and command
 * inputs.
 */

export const assetStatuses = ["active", "deleted"] as const;
export type AssetStatus = (typeof assetStatuses)[number];

export const syncConflictStatuses = ["open", "resolved"] as const;
export type SyncConflictStatus = (typeof syncConflictStatuses)[number];

export type AssetDomainErrorCode =
  | "ASSET_NOT_FOUND"
  | "ASSET_VERSION_NOT_FOUND"
  | "ASSET_PATH_INVALID"
  | "ASSET_PATH_CONFLICT"
  | "ASSET_HEAD_CONFLICT"
  | "ASSET_PARENT_CONFLICT"
  | "ASSET_ALREADY_DELETED"
  | "ASSET_CONFLICT_NOT_FOUND"
  | "ASSET_CONFLICT_ALREADY_RESOLVED"
  | "ASSET_IDEMPOTENCY_CONFLICT"
  | "ASSET_INVALID_VERSION";

/** Error raised when an asset invariant is violated. */
export class AssetDomainError extends DomainError<AssetDomainErrorCode> {
  constructor(code: AssetDomainErrorCode, message: string) {
    super(code, message);
    this.name = "AssetDomainError";
  }
}

export interface Asset {
  id: string;
  workspaceId: string;
  path: string;
  status: AssetStatus;
  headVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A version is immutable once committed. */
export interface AssetVersion {
  id: string;
  assetId: string;
  workspaceId: string;
  blobHash: string;
  byteSize: number;
  contentType: string | null;
  parentVersionId: string | null;
  createdBy: string;
  createdAt: Date;
  idempotencyKey: string;
}

export interface SyncConflict {
  id: string;
  workspaceId: string;
  assetId: string;
  localVersionId: string | null;
  remoteVersionId: string | null;
  expectedHeadVersionId: string | null;
  actualHeadVersionId: string | null;
  status: SyncConflictStatus;
  detectedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export interface AssetRepository {
  getById(id: string): Promise<Asset | null>;
  getByPath(input: { workspaceId: string; path: string }): Promise<Asset | null>;
  /** Insert only when the workspace path is still available. */
  createIfPathAvailable(
    asset: Asset,
  ): Promise<{ status: "created"; asset: Asset } | { status: "path_conflict" }>;
}

export interface AssetVersionRepository {
  getById(id: string): Promise<AssetVersion | null>;
  getByIdempotencyKey(input: {
    assetId: string;
    idempotencyKey: string;
  }): Promise<AssetVersion | null>;
}

export type AssetVersionCommitOutcome =
  | { status: "committed"; version: AssetVersion; asset: Asset }
  | { status: "head_conflict"; actualHeadVersionId: string | null }
  | { status: "not_found" };

export type SyncConflictResolveOutcome =
  | { status: "resolved"; conflict: SyncConflict }
  | { status: "not_found" }
  | { status: "already_resolved"; conflict: SyncConflict };

export interface SyncConflictRepository {
  getById(id: string): Promise<SyncConflict | null>;
  save(conflict: SyncConflict): Promise<void>;
  /** Resolve only while the stored conflict is still open. */
  resolve(conflict: SyncConflict): Promise<SyncConflictResolveOutcome>;
}

export interface AssetRepositories {
  assets: AssetRepository;
  versions: AssetVersionRepository;
  conflicts: SyncConflictRepository;
  /**
   * Atomically inserts a version and advances the asset head with a
   * compare-and-set on the observed head. Adapters must implement this in one
   * transaction so concurrent uploads cannot overwrite one another.
   */
  commitVersion(input: {
    version: AssetVersion;
    expectedHeadVersionId: string | null;
  }): Promise<AssetVersionCommitOutcome>;
}

export interface CreateAssetInput {
  workspaceId: string;
  path: string;
}

export interface CommitAssetVersionInput {
  actorId: string;
  assetId: string;
  workspaceId: string;
  blobHash: string;
  byteSize: number;
  contentType?: string | null;
  /** The head observed by the client before uploading this version. */
  expectedHeadVersionId: string | null;
  /** Must equal expectedHeadVersionId for a non-initial version. */
  parentVersionId: string | null;
  idempotencyKey: string;
  localVersionId?: string | null;
}

export interface CommitAssetVersionResult {
  version: AssetVersion;
  asset: Asset;
}

const pathSeparators = /\\/g;

/** Normalize a user-facing path to the canonical slash-separated form. */
export function normalizeAssetPath(value: string): string {
  const path = value.trim().replace(pathSeparators, "/");
  const segments = path.split("/").filter(Boolean);
  if (
    !path ||
    path.startsWith("/") ||
    /^[A-Za-z]:\//.test(path) ||
    !segments.length ||
    segments.some(
      (segment) =>
        !segment.trim() ||
        segment.trim() === "." ||
        segment.trim() === ".." ||
        segment.includes("\0"),
    )
  ) {
    throw new AssetDomainError(
      "ASSET_PATH_INVALID",
      "Asset paths must contain normal, non-empty segments.",
    );
  }
  const normalized = segments.join("/");
  if (normalized.length > 1024) {
    throw new AssetDomainError(
      "ASSET_PATH_INVALID",
      "Asset path is outside the workspace or is too long.",
    );
  }
  return normalized;
}

export function assertAssetVersionInput(
  input: Pick<CommitAssetVersionInput, "blobHash" | "byteSize" | "idempotencyKey" | "contentType">,
): void {
  if (!input.blobHash.trim() || !/^[a-f0-9]{16,}$/.test(input.blobHash)) {
    throw new AssetDomainError(
      "ASSET_INVALID_VERSION",
      "Asset versions require a lowercase hexadecimal blob hash.",
    );
  }
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 0) {
    throw new AssetDomainError(
      "ASSET_INVALID_VERSION",
      "Asset version byteSize must be a non-negative integer.",
    );
  }
  if (input.contentType !== undefined && input.contentType !== null && !input.contentType.trim()) {
    throw new AssetDomainError(
      "ASSET_INVALID_VERSION",
      "Asset version contentType must not be empty.",
    );
  }
  if (!input.idempotencyKey.trim() || input.idempotencyKey.trim().length > 500) {
    throw new AssetDomainError(
      "ASSET_INVALID_VERSION",
      "Asset version commits require an idempotency key.",
    );
  }
}

function matchesIdempotentRequest(
  version: AssetVersion,
  input: CommitAssetVersionInput,
  idempotencyKey: string,
): boolean {
  return (
    version.assetId === input.assetId &&
    version.workspaceId === input.workspaceId &&
    version.createdBy === input.actorId &&
    version.blobHash === input.blobHash &&
    version.byteSize === input.byteSize &&
    version.contentType === (input.contentType === undefined ? null : input.contentType) &&
    version.parentVersionId === input.parentVersionId &&
    version.idempotencyKey === idempotencyKey
  );
}

export function assertVersionParent(input: {
  currentHeadVersionId: string | null;
  expectedHeadVersionId: string | null;
  parentVersionId: string | null;
}): void {
  if (input.expectedHeadVersionId !== input.currentHeadVersionId) {
    throw new AssetDomainError(
      "ASSET_HEAD_CONFLICT",
      "The asset changed after this device read its head.",
    );
  }
  if (input.parentVersionId !== input.expectedHeadVersionId) {
    throw new AssetDomainError(
      "ASSET_PARENT_CONFLICT",
      "The new version parent must equal the observed asset head.",
    );
  }
}

export function isAssetDeleted(asset: Asset): boolean {
  return asset.status === "deleted";
}

export function createAssetAdministration(options: {
  repositories: AssetRepositories;
  now?: () => Date;
  id?: () => string;
}) {
  const now = options.now ?? (() => defaultClock.now());
  const id = options.id ?? (() => defaultIdGenerator.next());

  return {
    async create(input: CreateAssetInput): Promise<Asset> {
      const workspaceId = input.workspaceId.trim();
      if (!workspaceId) {
        throw new AssetDomainError("ASSET_PATH_INVALID", "Assets require a workspace.");
      }
      const path = normalizeAssetPath(input.path);
      const timestamp = now();
      const asset: Asset = {
        id: id(),
        workspaceId,
        path,
        status: "active",
        headVersionId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const created = await options.repositories.assets.createIfPathAvailable(asset);
      if (created.status === "path_conflict") {
        throw new AssetDomainError("ASSET_PATH_CONFLICT", "An asset already exists at this path.");
      }
      return created.asset;
    },

    async get(assetId: string): Promise<Asset | null> {
      return options.repositories.assets.getById(assetId);
    },

    async commitVersion(input: CommitAssetVersionInput): Promise<CommitAssetVersionResult> {
      assertAssetVersionInput(input);
      const workspaceId = input.workspaceId.trim();
      const actorId = input.actorId.trim();
      if (!workspaceId || !actorId) {
        throw new AssetDomainError(
          "ASSET_INVALID_VERSION",
          "Asset versions require a workspace and actor.",
        );
      }
      const idempotencyKey = input.idempotencyKey.trim();
      const existing = await options.repositories.versions.getByIdempotencyKey({
        assetId: input.assetId,
        idempotencyKey,
      });
      if (existing) {
        if (
          !matchesIdempotentRequest(existing, { ...input, workspaceId, actorId }, idempotencyKey)
        ) {
          throw new AssetDomainError(
            "ASSET_IDEMPOTENCY_CONFLICT",
            "The idempotency key was already used for another version.",
          );
        }
        const asset = await options.repositories.assets.getById(input.assetId);
        if (!asset)
          throw new AssetDomainError("ASSET_NOT_FOUND", "The requested asset does not exist.");
        return { version: existing, asset };
      }

      const asset = await options.repositories.assets.getById(input.assetId);
      if (!asset || asset.workspaceId !== workspaceId) {
        throw new AssetDomainError("ASSET_NOT_FOUND", "The requested asset does not exist.");
      }
      if (isAssetDeleted(asset)) {
        throw new AssetDomainError(
          "ASSET_ALREADY_DELETED",
          "Deleted assets cannot receive new versions.",
        );
      }
      if (input.expectedHeadVersionId !== asset.headVersionId) {
        const conflict: SyncConflict = {
          id: id(),
          workspaceId,
          assetId: input.assetId,
          localVersionId: input.localVersionId === undefined ? null : input.localVersionId,
          remoteVersionId: asset.headVersionId,
          expectedHeadVersionId: input.expectedHeadVersionId,
          actualHeadVersionId: asset.headVersionId,
          status: "open",
          detectedAt: now(),
          resolvedAt: null,
          resolvedBy: null,
        };
        await options.repositories.conflicts.save(conflict);
        throw new AssetDomainError(
          "ASSET_HEAD_CONFLICT",
          "The asset changed after this device read its head.",
        );
      }
      assertVersionParent({
        currentHeadVersionId: asset.headVersionId,
        expectedHeadVersionId: input.expectedHeadVersionId,
        parentVersionId: input.parentVersionId,
      });
      if (input.parentVersionId !== null) {
        const parent = await options.repositories.versions.getById(input.parentVersionId);
        if (!parent || parent.assetId !== asset.id || parent.workspaceId !== asset.workspaceId) {
          throw new AssetDomainError(
            "ASSET_VERSION_NOT_FOUND",
            "The requested parent version does not belong to this asset.",
          );
        }
      }

      const timestamp = now();
      const version: AssetVersion = {
        id: id(),
        assetId: input.assetId,
        workspaceId,
        blobHash: input.blobHash,
        byteSize: input.byteSize,
        contentType: input.contentType === undefined ? null : input.contentType,
        parentVersionId: input.parentVersionId,
        createdBy: actorId,
        createdAt: timestamp,
        idempotencyKey,
      };
      const committed = await options.repositories.commitVersion({
        version,
        expectedHeadVersionId: input.expectedHeadVersionId,
      });
      if (committed.status === "not_found") {
        throw new AssetDomainError("ASSET_NOT_FOUND", "The requested asset does not exist.");
      }
      if (committed.status === "head_conflict") {
        await options.repositories.conflicts.save({
          id: id(),
          workspaceId,
          assetId: input.assetId,
          localVersionId: input.localVersionId === undefined ? null : input.localVersionId,
          remoteVersionId: committed.actualHeadVersionId,
          expectedHeadVersionId: input.expectedHeadVersionId,
          actualHeadVersionId: committed.actualHeadVersionId,
          status: "open",
          detectedAt: now(),
          resolvedAt: null,
          resolvedBy: null,
        });
        throw new AssetDomainError(
          "ASSET_HEAD_CONFLICT",
          "The asset changed after this device read its head.",
        );
      }
      if (
        !matchesIdempotentRequest(
          committed.version,
          { ...input, workspaceId, actorId },
          idempotencyKey,
        )
      ) {
        throw new AssetDomainError(
          "ASSET_IDEMPOTENCY_CONFLICT",
          "The idempotency key was already used for another version.",
        );
      }
      return { version: committed.version, asset: committed.asset };
    },

    async recordConflict(input: {
      workspaceId: string;
      assetId: string;
      expectedHeadVersionId: string | null;
      actualHeadVersionId: string | null;
      localVersionId?: string | null;
      remoteVersionId?: string | null;
    }): Promise<SyncConflict> {
      const workspaceId = input.workspaceId.trim();
      if (!workspaceId) {
        throw new AssetDomainError("ASSET_PATH_INVALID", "Conflicts require a workspace.");
      }
      const asset = await options.repositories.assets.getById(input.assetId);
      if (!asset || asset.workspaceId !== workspaceId) {
        throw new AssetDomainError("ASSET_NOT_FOUND", "The requested asset does not exist.");
      }
      const conflict: SyncConflict = {
        id: id(),
        workspaceId,
        assetId: input.assetId,
        localVersionId: input.localVersionId === undefined ? null : input.localVersionId,
        remoteVersionId: input.remoteVersionId === undefined ? null : input.remoteVersionId,
        expectedHeadVersionId: input.expectedHeadVersionId,
        actualHeadVersionId: input.actualHeadVersionId,
        status: "open",
        detectedAt: now(),
        resolvedAt: null,
        resolvedBy: null,
      };
      await options.repositories.conflicts.save(conflict);
      return conflict;
    },

    async getConflict(conflictId: string): Promise<SyncConflict | null> {
      return options.repositories.conflicts.getById(conflictId);
    },

    async resolveConflict(input: { conflictId: string; actorId: string }): Promise<SyncConflict> {
      const conflict = await options.repositories.conflicts.getById(input.conflictId);
      if (!conflict)
        throw new AssetDomainError(
          "ASSET_CONFLICT_NOT_FOUND",
          "The requested sync conflict does not exist.",
        );
      if (conflict.status === "resolved") {
        throw new AssetDomainError(
          "ASSET_CONFLICT_ALREADY_RESOLVED",
          "The sync conflict has already been resolved.",
        );
      }
      const resolved: SyncConflict = {
        ...conflict,
        status: "resolved",
        resolvedAt: now(),
        resolvedBy: input.actorId,
      };
      const result = await options.repositories.conflicts.resolve(resolved);
      if (result.status === "resolved") return result.conflict;
      if (result.status === "not_found") {
        throw new AssetDomainError(
          "ASSET_CONFLICT_NOT_FOUND",
          "The requested sync conflict does not exist.",
        );
      }
      throw new AssetDomainError(
        "ASSET_CONFLICT_ALREADY_RESOLVED",
        "The sync conflict has already been resolved.",
      );
    },
  };
}
