import { hasPermission, type Permission } from "@voidmix/auth";
import { apiContract } from "@voidmix/contracts";
import { implement } from "@orpc/server";
import { evlog as orpcEvlog } from "@voidmix/shared/logger/orpc";

import type { ApiContext, CreateApiRouterOptions } from "./api-types.js";
import { createApiError, mapDomainError } from "./canonical-errors.js";

export function createCanonicalApiRouter(options: CreateApiRouterOptions) {
  const os = implement(apiContract)
    .$context<ApiContext>()
    .use(orpcEvlog())
    .use(async ({ context, next }) => {
      context.log?.set({ requestId: context.requestId });
      context.resHeaders?.set("x-request-id", context.requestId);
      return next();
    });
  const requireAuthenticated = os.middleware(async ({ context, next }) => {
    const session = context.auth.session;
    if (!session) throw createApiError("UNAUTHORIZED");
    return next({ context: { principal: { session, user: session.user } } });
  });
  const requirePermission = (permission: Permission) =>
    requireAuthenticated.use(async ({ context, next }) => {
      if (!hasPermission(context.principal.session, permission)) throw createApiError("FORBIDDEN");
      return next({ context: { principal: context.principal } });
    });
  const v2Projects = () => {
    if (!options.modules.v2Projects)
      throw createApiError("INTERNAL_SERVER_ERROR", "V2_PROJECTS_NOT_CONFIGURED");
    return options.modules.v2Projects;
  };
  const agentRuns = () => {
    if (!options.modules.v2AgentRuns)
      throw createApiError("INTERNAL_SERVER_ERROR", "V2_AGENT_RUNS_NOT_CONFIGURED");
    return options.modules.v2AgentRuns;
  };
  const call = async <Result>(operation: () => Promise<Result>): Promise<Result> => {
    try {
      return await operation();
    } catch (error) {
      throw mapDomainError(error);
    }
  };

  return os.router({
    health: os.health.handler(() => ({
      status: "ok" as const,
      timestamp: options.now?.() ?? new Date(),
    })),
    account: {
      get: os.account.get.use(requireAuthenticated).handler(({ context }) => {
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
      list: os.projects.list.use(requireAuthenticated).handler(({ context }) =>
        call(() => v2Projects().listForUser(context.principal.user.id)).then((items) => ({
          items,
          nextCursor: null,
        })),
      ),
      get: os.projects.get.use(requireAuthenticated).handler(async ({ context, input }) => {
        const result = await call(() =>
          v2Projects().get({ actorId: context.principal.user.id, projectId: input.projectId }),
        );
        if (!result || result.access === "none")
          throw createApiError("NOT_FOUND", "PROJECT_NOT_FOUND");
        return { project: result.project, access: result.access };
      }),
      create: os.projects.create.use(requireAuthenticated).handler(({ context, input }) =>
        call(() =>
          v2Projects().create({
            actorId: context.principal.user.id,
            scope: { type: "personal", userId: context.principal.user.id },
            title: input.title,
            ...(input.description !== undefined ? { description: input.description } : {}),
          }),
        ),
      ),
      update: os.projects.update.use(requireAuthenticated).handler(({ context, input }) =>
        call(() =>
          v2Projects().updateProject({
            actorId: context.principal.user.id,
            projectId: input.projectId,
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.stage !== undefined ? { stage: input.stage } : {}),
            ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
          }),
        ),
      ),
      archive: os.projects.archive.use(requireAuthenticated).handler(({ context, input }) =>
        call(() =>
          v2Projects().archiveProject({
            actorId: context.principal.user.id,
            projectId: input.projectId,
          }),
        ),
      ),
      restore: os.projects.restore.use(requireAuthenticated).handler(({ context, input }) =>
        call(() =>
          v2Projects().restoreProject({
            actorId: context.principal.user.id,
            projectId: input.projectId,
          }),
        ),
      ),
      delete: os.projects.delete.use(requireAuthenticated).handler(async ({ context, input }) => {
        await call(() =>
          v2Projects().deleteProject({
            actorId: context.principal.user.id,
            projectId: input.projectId,
          }),
        );
        return { deleted: true as const };
      }),
      tasks: {
        list: os.projects.tasks.list.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().listTasks({
              actorId: context.principal.user.id,
              projectId: input.projectId,
            }),
          ).then((items) => ({ items, nextCursor: null })),
        ),
        create: os.projects.tasks.create.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().createTask({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              title: input.title,
            }),
          ),
        ),
        update: os.projects.tasks.update.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().updateTask({
              actorId: context.principal.user.id,
              taskId: input.taskId,
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.status !== undefined ? { status: input.status } : {}),
            }),
          ),
        ),
      },
      members: {
        list: os.projects.members.list.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().listMembers({
              actorId: context.principal.user.id,
              projectId: input.projectId,
            }),
          ).then((items) => ({ items, nextCursor: null })),
        ),
        add: os.projects.members.add.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().addMember({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              userId: input.userId,
              role: input.role,
            }),
          ),
        ),
        update: os.projects.members.update.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().updateMember({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              userId: input.userId,
              role: input.role,
            }),
          ),
        ),
        remove: os.projects.members.remove.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().removeMember({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              userId: input.userId,
            }),
          ),
        ),
      },
      reviews: {
        list: os.projects.reviews.list.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().listReviews({
              actorId: context.principal.user.id,
              projectId: input.projectId,
            }),
          ).then((items) => ({ items, nextCursor: null })),
        ),
        create: os.projects.reviews.create.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().createReview({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              assetVersionId: input.assetVersionId,
              title: input.title,
            }),
          ),
        ),
        update: os.projects.reviews.update.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().updateReview({
              actorId: context.principal.user.id,
              reviewId: input.reviewId,
              status: input.status,
            }),
          ),
        ),
        feedback: {
          list: os.projects.reviews.feedback.list
            .use(requireAuthenticated)
            .handler(({ context, input }) =>
              call(() =>
                v2Projects().listFeedback({
                  actorId: context.principal.user.id,
                  reviewId: input.reviewId,
                }),
              ).then((items) => ({ items, nextCursor: null })),
            ),
          create: os.projects.reviews.feedback.create
            .use(requireAuthenticated)
            .handler(({ context, input }) =>
              call(() =>
                v2Projects().createFeedback({
                  actorId: context.principal.user.id,
                  reviewId: input.reviewId,
                  body: input.body,
                }),
              ),
            ),
        },
      },
      assets: {
        list: os.projects.assets.list.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().listAssets({
              actorId: context.principal.user.id,
              projectId: input.projectId,
            }),
          ).then((items) => ({ items, nextCursor: null })),
        ),
        create: os.projects.assets.create.use(requireAuthenticated).handler(({ context, input }) =>
          call(() =>
            v2Projects().createAsset({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              name: input.name,
            }),
          ),
        ),
        versions: {
          list: os.projects.assets.versions.list
            .use(requireAuthenticated)
            .handler(({ context, input }) =>
              call(() =>
                v2Projects().listAssetVersions({
                  actorId: context.principal.user.id,
                  assetId: input.assetId,
                }),
              ).then((items) => ({ items, nextCursor: null })),
            ),
        },
        upload: {
          create: os.projects.assets.upload.create
            .use(requireAuthenticated)
            .handler(({ context, input }) =>
              call(() =>
                v2Projects().createAssetUpload({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                  byteSize: input.byteSize,
                  contentType: input.contentType,
                  expectedHash: input.expectedHash,
                }),
              ),
            ),
          complete: os.projects.assets.upload.complete
            .use(requireAuthenticated)
            .handler(({ context, input }) =>
              call(() =>
                v2Projects().completeAssetUpload({
                  actorId: context.principal.user.id,
                  assetId: input.assetId,
                  uploadId: input.uploadId,
                  byteSize: input.byteSize,
                  contentType: input.contentType,
                  checksum: input.checksum,
                }),
              ),
            ),
        },
      },
      agentRuns: {
        create: os.projects.agentRuns.create
          .use(requireAuthenticated)
          .handler(({ context, input }) =>
            call(() =>
              agentRuns().create({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                ...(input.assetVersionId !== undefined
                  ? { assetVersionId: input.assetVersionId }
                  : {}),
                idempotencyKey: input.idempotencyKey,
                input: input.input,
              }),
            ),
          ),
        get: os.projects.agentRuns.get
          .use(requireAuthenticated)
          .handler(({ context, input }) =>
            call(() => agentRuns().get({ actorId: context.principal.user.id, runId: input.runId })),
          ),
        cancel: os.projects.agentRuns.cancel
          .use(requireAuthenticated)
          .handler(({ context, input }) =>
            call(() =>
              agentRuns().cancel({ actorId: context.principal.user.id, runId: input.runId }),
            ),
          ),
        retry: os.projects.agentRuns.retry
          .use(requireAuthenticated)
          .handler(({ context, input }) =>
            call(() =>
              agentRuns().retry({ actorId: context.principal.user.id, runId: input.runId }),
            ),
          ),
      },
    },
    library: {
      assets: {
        list: os.library.assets.list
          .use(requireAuthenticated)
          .handler(async ({ context, input }) => {
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
            return { items, nextCursor: null };
          }),
      },
    },
    assets: {
      upload: {
        create: os.assets.upload.create
          .use(requireAuthenticated)
          .handler(({ context, input }) =>
            call(() =>
              v2Projects().createAssetUpload({ actorId: context.principal.user.id, ...input }),
            ),
          ),
        complete: os.assets.upload.complete
          .use(requireAuthenticated)
          .handler(({ context, input }) =>
            call(() =>
              v2Projects().completeAssetUpload({ actorId: context.principal.user.id, ...input }),
            ),
          ),
      },
    },
    activity: {
      list: os.activity.list.use(requireAuthenticated).handler(async ({ context, input }) => {
        if (!options.modules.activity) return { items: [], nextCursor: null };
        const items = await v2Projects().listActivity({
          actorId: context.principal.user.id,
          ...(input.projectId ? { projectId: input.projectId } : {}),
        });
        return { items, nextCursor: null };
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
