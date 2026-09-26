import type { CreateApiRouterOptions } from "./api-types.js";
import { createApiError } from "./canonical-errors.js";
import { createRouterContext, actorInput, page } from "./router-context.js";
export function createCanonicalApiRouter(options: CreateApiRouterOptions) {
  const { os, authenticated, requirePermission, v2Projects, agentRuns, call, command, list } =
    createRouterContext(options);
  return os.router({
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
    projects: {
      list: authenticated.projects.list.handler(({ context }) =>
        call(() => v2Projects().listForUser(context.principal.user.id)).then(page),
      ),
      get: authenticated.projects.get.handler(async ({ context, input }) => {
        const result = await call(() => v2Projects().get(actorInput(context, input)));
        if (!result || result.access === "none")
          throw createApiError("NOT_FOUND", "PROJECT_NOT_FOUND");
        return { project: result.project, access: result.access };
      }),
      create: authenticated.projects.create.handler(({ context, input }) =>
        call(() =>
          v2Projects().create({
            actorId: context.principal.user.id,
            scope: { type: "personal", userId: context.principal.user.id },
            title: input.title,
            ...(input.description !== undefined ? { description: input.description } : {}),
          }),
        ),
      ),
      update: authenticated.projects.update.handler(command(() => v2Projects().updateProject)),
      archive: authenticated.projects.archive.handler(command(() => v2Projects().archiveProject)),
      restore: authenticated.projects.restore.handler(command(() => v2Projects().restoreProject)),
      delete: authenticated.projects.delete.handler(async ({ context, input }) => {
        await call(() => v2Projects().deleteProject(actorInput(context, input)));
        return { deleted: true as const };
      }),
      tasks: {
        list: authenticated.projects.tasks.list.handler(list(() => v2Projects().listTasks)),
        create: authenticated.projects.tasks.create.handler(command(() => v2Projects().createTask)),
        update: authenticated.projects.tasks.update.handler(command(() => v2Projects().updateTask)),
      },
      members: {
        list: authenticated.projects.members.list.handler(list(() => v2Projects().listMembers)),
        add: authenticated.projects.members.add.handler(command(() => v2Projects().addMember)),
        update: authenticated.projects.members.update.handler(
          command(() => v2Projects().updateMember),
        ),
        remove: authenticated.projects.members.remove.handler(
          command(() => v2Projects().removeMember),
        ),
      },
      reviews: {
        list: authenticated.projects.reviews.list.handler(list(() => v2Projects().listReviews)),
        create: authenticated.projects.reviews.create.handler(
          command(() => v2Projects().createReview),
        ),
        update: authenticated.projects.reviews.update.handler(
          command(() => v2Projects().updateReview),
        ),
        feedback: {
          list: authenticated.projects.reviews.feedback.list.handler(
            list(() => v2Projects().listFeedback),
          ),
          create: authenticated.projects.reviews.feedback.create.handler(
            command(() => v2Projects().createFeedback),
          ),
        },
      },
      assets: {
        list: authenticated.projects.assets.list.handler(list(() => v2Projects().listAssets)),
        create: authenticated.projects.assets.create.handler(
          command(() => v2Projects().createAsset),
        ),
        versions: {
          list: authenticated.projects.assets.versions.list.handler(
            list(() => v2Projects().listAssetVersions),
          ),
        },
        upload: {
          create: authenticated.projects.assets.upload.create.handler(
            command(() => v2Projects().createAssetUpload),
          ),
          complete: authenticated.projects.assets.upload.complete.handler(
            command(() => v2Projects().completeAssetUpload),
          ),
        },
      },
      agentRuns: {
        create: authenticated.projects.agentRuns.create.handler(command(() => agentRuns().create)),
        get: authenticated.projects.agentRuns.get.handler(command(() => agentRuns().get)),
        cancel: authenticated.projects.agentRuns.cancel.handler(command(() => agentRuns().cancel)),
        retry: authenticated.projects.agentRuns.retry.handler(command(() => agentRuns().retry)),
      },
    },
    library: {
      assets: {
        list: authenticated.library.assets.list.handler(async ({ context, input }) => {
          const items = input.projectId
            ? await call(() =>
                v2Projects().listAssets({
                  actorId: context.principal.user.id,
                  projectId: input.projectId!,
                }),
              )
            : (
                await Promise.all(
                  (await v2Projects().listForUser(context.principal.user.id)).map((project) =>
                    v2Projects().listAssets({
                      actorId: context.principal.user.id,
                      projectId: project.id,
                    }),
                  ),
                )
              ).flat();
          return page(items);
        }),
      },
    },
    assets: {
      upload: {
        create: authenticated.assets.upload.create.handler(
          command(() => v2Projects().createAssetUpload),
        ),
        complete: authenticated.assets.upload.complete.handler(
          command(() => v2Projects().completeAssetUpload),
        ),
      },
    },
    activity: {
      list: authenticated.activity.list.handler(async ({ context, input }) => {
        if (!options.modules.activity) return { items: [], nextCursor: null };
        const items = await v2Projects().listActivity(actorInput(context, input));
        return page(items);
      }),
    },
    admin: {
      users: {
        list: os.admin.users.list.use(requirePermission("admin.users.read")).handler(({ input }) =>
          options.modules.users.list({
            limit: input.limit,
            ...(input.query ? { query: input.query } : {}),
            ...(input.cursor ? { cursor: input.cursor } : {}),
          }),
        ),
        get: os.admin.users.get
          .use(requirePermission("admin.users.read"))
          .handler(async ({ input }) => {
            const user = await options.modules.users.get(input.userId);
            if (!user) throw createApiError("NOT_FOUND", "USER_NOT_FOUND");
            return user;
          }),
        updateStatus: os.admin.users.updateStatus
          .use(requirePermission("admin.users.write"))
          .handler(({ context, input }) =>
            call(() =>
              options.modules.users.updateStatus({
                actorId: context.principal.user.id,
                userId: input.userId,
                status: input.status,
              }),
            ),
          ),
      },
      audit: {
        list: os.admin.audit.list
          .use(requirePermission("admin.audit.read"))
          .handler(({ input }) => options.modules.users.audit(input.limit)),
      },
    },
  });
}
