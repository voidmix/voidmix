import { createProjectHandlers } from "./project-handlers.js";
import { createIdentityHandlers } from "./identity-handlers.js";
import type { CreateApiRouterOptions } from "./api-types.js";
import { createRouterContext } from "./router-context.js";
export function createCanonicalApiRouter(options: CreateApiRouterOptions) {
  const context = createRouterContext(options);
  const { os, authenticated, assets, command } = context;
  return os.router({
    projects: createProjectHandlers(context),
    admin: createIdentityHandlers(context, options),
    health: os.health.handler(() => ({
      status: "ok" as const,
      timestamp: options.now?.() ?? new Date(),
    })),
    account: {
      get: authenticated.account.get.handler(({ context }) => {
        const { id, email, displayName } = context.principal.user;
        return { id, email, displayName };
      }),
    },
    auth: {
      capabilities: {
        get: os.auth.capabilities.get.handler(() => options.modules.publicAuthCapabilities.get()),
      },
    },
    library: {
      assets: {
        list: authenticated.library.assets.list.handler(command(() => assets().listLibrary)),
      },
    },
    assets: {
      upload: {
        create: authenticated.assets.upload.create.handler(
          command(() => assets().createAssetUpload),
        ),
        complete: authenticated.assets.upload.complete.handler(
          command(() => assets().completeAssetUpload),
        ),
      },
    },
    activity: {
      list: authenticated.activity.list.handler(
        command(() => options.modules.activity.listActivity),
      ),
    },
  });
}
