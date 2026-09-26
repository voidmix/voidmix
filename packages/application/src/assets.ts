import type { ProjectApplication } from "./types.js";
import { requireResource, requiredText, type ProjectContext } from "./context.js";
export function assetsCommands({ options, now, id, requireProject }: ProjectContext) {
  const commands: Pick<
    ProjectApplication,
    "listAssets" | "createAsset" | "listAssetVersions" | "createAssetUpload" | "completeAssetUpload"
  > = {
    async listAssets({ actorId, projectId }) {
      await requireProject(actorId, projectId, "project.read", "Asset access denied.");
      return options.assets.listByProject(projectId);
    },

    async createAsset({ actorId, projectId, name }) {
      await requireProject(actorId, projectId, "project.write", "Asset creation denied.");
      const normalizedName = requiredText(name, "Asset name");
      return options.assets.create({
        id: id(),
        projectId,
        createdByUserId: actorId,
        name: normalizedName,
        now: now(),
      });
    },

    async listAssetVersions({ actorId, assetId }) {
      const asset = requireResource(await options.assets.getById(assetId), "Asset access denied.");
      await requireProject(actorId, asset.projectId, "project.read", "Asset access denied.");
      return options.assetVersions.listByAsset(assetId);
    },

    async createAssetUpload({ actorId, projectId, byteSize, contentType, expectedHash }) {
      await requireProject(actorId, projectId, "project.write", "Asset upload denied.");
      return options.blobStorage.createUpload({
        workspaceId: projectId,
        actorId,
        byteSize,
        contentType,
        expectedHash,
      });
    },

    async completeAssetUpload({
      actorId,
      assetId,
      uploadId,
      byteSize,
      contentType,
      checksum,
      body,
    }) {
      const asset = requireResource(await options.assets.getById(assetId), "Asset upload denied.");
      await requireProject(actorId, asset.projectId, "project.write", "Asset upload denied.");
      const completed = await options.blobStorage.completeUpload({
        uploadId,
        actorId,
        byteSize,
        contentType,
        blobHash: checksum,
        ...(body ? { body } : {}),
      });
      return options.assetVersions.create({
        id: id(),
        assetId,
        projectId: asset.projectId,
        createdByUserId: actorId,
        objectKey: `${asset.projectId}/${completed.blobHash}`,
        byteSize: completed.byteSize,
        mediaType: completed.contentType,
        checksum: completed.blobHash,
        now: now(),
      });
    },
  };
  return commands;
}
