import type { RouterContext } from "./router-context.js";
export function createAssetsHandlers({ authenticated, assets, command, list }: RouterContext) {
  return {
    list: authenticated.projects.assets.list.handler(list(() => assets().listAssets)),
    create: authenticated.projects.assets.create.handler(command(() => assets().createAsset)),
    versions: {
      list: authenticated.projects.assets.versions.list.handler(
        list(() => assets().listAssetVersions),
      ),
    },
    upload: {
      create: authenticated.projects.assets.upload.create.handler(
        command(() => assets().createAssetUpload),
      ),
      complete: authenticated.projects.assets.upload.complete.handler(
        command(() => assets().completeAssetUpload),
      ),
    },
  };
}
