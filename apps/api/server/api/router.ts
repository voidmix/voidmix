import { hasPermission, type Permission, type Session } from "@voidmix/auth";
import { apiContract } from "@voidmix/contracts";
import {
  AgentDomainError,
  AssetDomainError,
  DomainError,
  ProjectDomainError,
  ProjectStudioDomainError,
  ProjectV2DomainError,
  WorkspaceAccessError,
} from "@voidmix/core";
import { MailUnavailableError } from "@voidmix/mail/server";
import { implement, ORPCError } from "@orpc/server";
import type {
  RequestHeadersHandlerPluginContext,
  ResponseHeadersHandlerPluginContext,
} from "@orpc/server/plugins";
import { evlog as orpcEvlog, type EvlogOrpcContext } from "@voidmix/logger/orpc";

import type { ApiRequestContext } from "./context.js";
import type { ApiModules } from "./modules.js";

export interface ApiContext
  extends
    ApiRequestContext,
    RequestHeadersHandlerPluginContext,
    ResponseHeadersHandlerPluginContext {
  log?: EvlogOrpcContext["log"];
}

export interface CreateApiRouterOptions {
  modules: ApiModules;
  now?: () => Date;
  invalidateAuthSettings?: () => Promise<void>;
}

export function createApiRouter(options: CreateApiRouterOptions) {
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
    if (!session) {
      context.log?.set({ user: null, permissionResult: "denied" });
      throw createApiError("UNAUTHORIZED");
    }
    return next({
      context: {
        principal: { session, user: session.user },
      },
    });
  });
  const requirePermission = (permission: Permission) =>
    requireAuthenticated.use(async ({ context, next }) => {
      const session = context.principal.session;
      const granted = hasPermission(session, permission);
      context.log?.set({
        user: { id: session.user.id, role: session.user.role },
        permission: { name: permission },
        permissionResult: granted ? "granted" : "denied",
      });
      if (!granted) throw createApiError("FORBIDDEN");
      return next({
        context: {
          principal: { session, user: session.user },
        },
      });
    });

  return os.router({
    health: os.health.handler(() => ({
      status: "ok" as const,
      timestamp: options.now?.() ?? new Date(),
    })),
    account: {
      profile: {
        get: os.account.profile.get.use(requireAuthenticated).handler(({ context }) => {
          const { id, email, displayName } = context.principal.user;
          context.log?.set({ user: { id }, permissionResult: "granted" });
          return { id, email, displayName };
        }),
      },
    },
    v2: {
      projects: {
        list: os.v2.projects.list.use(requireAuthenticated).handler(async ({ context }) => {
          const application = requireV2Projects(options.modules);
          return callV2(() => application.listForUser(context.principal.user.id)).then((items) => ({
            items,
            nextCursor: null,
          }));
        }),
        get: os.v2.projects.get.use(requireAuthenticated).handler(async ({ context, input }) => {
          const application = requireV2Projects(options.modules);
          const result = await callV2(() =>
            application.get({
              actorId: context.principal.user.id,
              projectId: input.projectId,
            }),
          );
          if (!result || result.access === "none")
            throw createApiError("NOT_FOUND", "PROJECT_NOT_FOUND");
          const access = result.access;
          return { project: result.project, access };
        }),
        create: os.v2.projects.create
          .use(requireAuthenticated)
          .handler(async ({ context, input }) => {
            const application = requireV2Projects(options.modules);
            const scope =
              input.scope.type === "personal"
                ? { type: "personal" as const, userId: context.principal.user.id }
                : { type: "organization" as const, organizationId: input.scope.organizationId };
            return callV2(() =>
              application.create({
                actorId: context.principal.user.id,
                scope,
                title: input.title,
                ...(input.description !== undefined ? { description: input.description } : {}),
              }),
            );
          }),
        update: os.v2.projects.update
          .use(requireAuthenticated)
          .handler(async ({ context, input }) => {
            const application = requireV2Projects(options.modules);
            return callV2(() =>
              application.updateProject({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                ...(input.title !== undefined ? { title: input.title } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
                ...(input.stage !== undefined ? { stage: input.stage } : {}),
                ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
              }),
            );
          }),
        archive: os.v2.projects.archive
          .use(requireAuthenticated)
          .handler(async ({ context, input }) => {
            const application = requireV2Projects(options.modules);
            return callV2(() =>
              application.archiveProject({
                actorId: context.principal.user.id,
                projectId: input.projectId,
              }),
            );
          }),
        restore: os.v2.projects.restore
          .use(requireAuthenticated)
          .handler(async ({ context, input }) => {
            const application = requireV2Projects(options.modules);
            return callV2(() =>
              application.restoreProject({
                actorId: context.principal.user.id,
                projectId: input.projectId,
              }),
            );
          }),
        delete: os.v2.projects.delete
          .use(requireAuthenticated)
          .handler(async ({ context, input }) => {
            const application = requireV2Projects(options.modules);
            await callV2(() =>
              application.deleteProject({
                actorId: context.principal.user.id,
                projectId: input.projectId,
              }),
            );
            return { deleted: true as const };
          }),
        tasks: {
          list: os.v2.projects.tasks.list
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              const items = await callV2(() =>
                application.listTasks({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                }),
              );
              return { items, nextCursor: null };
            }),
          create: os.v2.projects.tasks.create
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              return callV2(() =>
                application.createTask({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                  title: input.title,
                }),
              );
            }),
          update: os.v2.projects.tasks.update
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              return callV2(() =>
                application.updateTask({
                  actorId: context.principal.user.id,
                  taskId: input.taskId,
                  ...(input.title !== undefined ? { title: input.title } : {}),
                  ...(input.status !== undefined ? { status: input.status } : {}),
                }),
              );
            }),
        },
        members: {
          list: os.v2.projects.members.list
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              const items = await callV2(() =>
                application.listMembers({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                }),
              );
              return { items, nextCursor: null };
            }),
          add: os.v2.projects.members.add
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              return callV2(() =>
                application.addMember({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                  userId: input.userId,
                  role: input.role,
                }),
              );
            }),
          update: os.v2.projects.members.update
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              return callV2(() =>
                application.updateMember({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                  userId: input.userId,
                  role: input.role,
                }),
              );
            }),
          remove: os.v2.projects.members.remove
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              return callV2(() =>
                application.removeMember({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                  userId: input.userId,
                }),
              );
            }),
        },
        reviews: {
          list: os.v2.projects.reviews.list
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              const items = await callV2(() =>
                application.listReviews({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                }),
              );
              return { items, nextCursor: null };
            }),
          create: os.v2.projects.reviews.create
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              return callV2(() =>
                application.createReview({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                  assetVersionId: input.assetVersionId,
                  title: input.title,
                }),
              );
            }),
          update: os.v2.projects.reviews.update
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              return callV2(() =>
                application.updateReview({
                  actorId: context.principal.user.id,
                  reviewId: input.reviewId,
                  status: input.status,
                }),
              );
            }),
          feedback: {
            list: os.v2.projects.reviews.feedback.list
              .use(requireAuthenticated)
              .handler(async ({ context, input }) => {
                const application = requireV2Projects(options.modules);
                const items = await callV2(() =>
                  application.listFeedback({
                    actorId: context.principal.user.id,
                    reviewId: input.reviewId,
                  }),
                );
                return { items, nextCursor: null };
              }),
            create: os.v2.projects.reviews.feedback.create
              .use(requireAuthenticated)
              .handler(async ({ context, input }) => {
                const application = requireV2Projects(options.modules);
                return callV2(() =>
                  application.createFeedback({
                    actorId: context.principal.user.id,
                    reviewId: input.reviewId,
                    body: input.body,
                  }),
                );
              }),
          },
        },
        assets: {
          list: os.v2.projects.assets.list
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              const items = await callV2(() =>
                application.listAssets({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                }),
              );
              return { items, nextCursor: null };
            }),
          create: os.v2.projects.assets.create
            .use(requireAuthenticated)
            .handler(async ({ context, input }) => {
              const application = requireV2Projects(options.modules);
              return callV2(() =>
                application.createAsset({
                  actorId: context.principal.user.id,
                  projectId: input.projectId,
                  name: input.name,
                }),
              );
            }),
          versions: {
            list: os.v2.projects.assets.versions.list
              .use(requireAuthenticated)
              .handler(async ({ context, input }) => {
                const application = requireV2Projects(options.modules);
                const items = await callV2(() =>
                  application.listAssetVersions({
                    actorId: context.principal.user.id,
                    assetId: input.assetId,
                  }),
                );
                return { items, nextCursor: null };
              }),
          },
          upload: {
            create: os.v2.projects.assets.upload.create
              .use(requireAuthenticated)
              .handler(async ({ context, input }) => {
                const application = requireV2Projects(options.modules);
                return callV2(() =>
                  application.createAssetUpload({
                    actorId: context.principal.user.id,
                    projectId: input.projectId,
                    byteSize: input.byteSize,
                    contentType: input.contentType,
                    expectedHash: input.expectedHash,
                  }),
                );
              }),
            complete: os.v2.projects.assets.upload.complete
              .use(requireAuthenticated)
              .handler(async ({ context, input }) => {
                const application = requireV2Projects(options.modules);
                return callV2(() =>
                  application.completeAssetUpload({
                    actorId: context.principal.user.id,
                    assetId: input.assetId,
                    uploadId: input.uploadId,
                    byteSize: input.byteSize,
                    contentType: input.contentType,
                    checksum: input.checksum,
                    ...(input.body
                      ? { body: Uint8Array.from(Buffer.from(input.body, "base64")) }
                      : {}),
                  }),
                );
              }),
          },
        },
      },
    },
    studio: {
      snapshot: {
        get: os.studio.snapshot.get
          .use(requirePermission("workspace.assets.read"))
          .handler(async ({ context }) => {
            const studio = requireStudioModule(options.modules);
            assertWorkspaceAccessConfigured(options.modules, context);
            const snapshot = await callStudio(() =>
              studio.getSnapshot({ actorId: context.principal.user.id }),
            );
            await assertWorkspaceCollectionAccess(
              options.modules,
              context,
              [
                ...snapshot.projects.map((project) => project.workspaceId),
                ...snapshot.reviewAttention.map((review) => review.workspaceId),
                ...snapshot.recentActivity.map((activity) => activity.workspaceId),
                ...snapshot.activeSessions.map((session) => session.workspaceId),
              ],
              "read",
            );
            return snapshot;
          }),
      },
    },
    projects: {
      list: os.projects.list
        .use(requirePermission("workspace.assets.read"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          assertWorkspaceAccessConfigured(options.modules, context);
          const page = await callStudio(() =>
            studio.listProjects({
              actorId: context.principal.user.id,
              limit: input.limit,
              ...(input.stage !== undefined ? { stage: input.stage } : {}),
              ...(input.archived !== undefined ? { archived: input.archived } : {}),
              ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
            }),
          );
          await assertWorkspaceCollectionAccess(
            options.modules,
            context,
            page.items.map((project) => project.workspaceId),
            "read",
          );
          return page;
        }),
      get: os.projects.get
        .use(requirePermission("workspace.assets.read"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          return requireStudioProject(studio, options.modules, context, input.projectId, "read");
        }),
      create: os.projects.create
        .use(requirePermission("workspace.assets.write"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          if (input.workspaceId !== undefined) {
            await assertWorkspaceAccess(options.modules, context, input.workspaceId, "write");
          }
          const project = await callStudio(() =>
            studio.createProject({
              actorId: context.principal.user.id,
              ...(input.workspaceId !== undefined ? { workspaceId: input.workspaceId } : {}),
              title: input.title,
              idempotencyKey: input.idempotencyKey,
              ...(input.description !== undefined ? { description: input.description } : {}),
              ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
            }),
          );
          await assertWorkspaceAccess(options.modules, context, project.workspaceId, "write");
          return project;
        }),
      update: os.projects.update
        .use(requirePermission("workspace.assets.write"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          await requireStudioProject(studio, options.modules, context, input.projectId, "write");
          const project = await callStudio(() =>
            studio.updateProject({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
              ...(input.cover !== undefined ? { cover: input.cover } : {}),
              ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
              ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
              ...(input.stage !== undefined ? { stage: input.stage } : {}),
            }),
          );
          await assertWorkspaceAccess(options.modules, context, project.workspaceId, "write");
          return project;
        }),
      archive: os.projects.archive
        .use(requirePermission("workspace.assets.write"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          await requireStudioProject(studio, options.modules, context, input.projectId, "write");
          const project = await callStudio(() =>
            studio.archiveProject({
              actorId: context.principal.user.id,
              projectId: input.projectId,
            }),
          );
          await assertWorkspaceAccess(options.modules, context, project.workspaceId, "write");
          return project;
        }),
      restore: os.projects.restore
        .use(requirePermission("workspace.assets.write"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          await requireStudioProject(studio, options.modules, context, input.projectId, "write");
          const project = await callStudio(() =>
            studio.restoreProject({
              actorId: context.principal.user.id,
              projectId: input.projectId,
            }),
          );
          await assertWorkspaceAccess(options.modules, context, project.workspaceId, "write");
          return project;
        }),
      members: {
        add: os.projects.members.add
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioProject(studio, options.modules, context, input.projectId, "write");
            return callStudio(() =>
              studio.addProjectMember({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                userId: input.userId,
                role: input.role,
              }),
            );
          }),
        update: os.projects.members.update
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioProject(studio, options.modules, context, input.projectId, "write");
            return callStudio(() =>
              studio.updateProjectMember({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                userId: input.userId,
                role: input.role,
              }),
            );
          }),
        remove: os.projects.members.remove
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioProject(studio, options.modules, context, input.projectId, "write");
            return callStudio(() =>
              studio.removeProjectMember({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                userId: input.userId,
              }),
            );
          }),
      },
      assets: {
        list: os.projects.assets.list
          .use(requirePermission("workspace.assets.read"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioProject(studio, options.modules, context, input.projectId, "read");
            const page = await callStudio(() =>
              studio.listProjectAssets({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                limit: input.limit,
                ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
              }),
            );
            await assertWorkspaceCollectionAccess(
              options.modules,
              context,
              page.items.map((asset) => asset.workspaceId),
              "read",
            );
            return page;
          }),
        create: os.projects.assets.create
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioProject(studio, options.modules, context, input.projectId, "write");
            return callStudio(() =>
              studio.createProjectAsset({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                assetId: input.assetId,
                ...(input.versionId !== undefined ? { versionId: input.versionId } : {}),
                ...(input.label !== undefined ? { label: input.label } : {}),
              }),
            );
          }),
      },
      tasks: {
        list: os.projects.tasks.list
          .use(requirePermission("workspace.assets.read"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioProject(studio, options.modules, context, input.projectId, "read");
            return callStudio(() =>
              studio.listProjectTasks({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                limit: input.limit,
                ...(input.status !== undefined ? { status: input.status } : {}),
                ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
              }),
            );
          }),
        create: os.projects.tasks.create
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioProject(studio, options.modules, context, input.projectId, "write");
            return callStudio(() =>
              studio.createProjectTask({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                title: input.title,
                idempotencyKey: input.idempotencyKey,
              }),
            );
          }),
        update: os.projects.tasks.update
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            const task = await callStudio(() =>
              studio.getProjectTask({
                actorId: context.principal.user.id,
                taskId: input.taskId,
              }),
            );
            if (!task) throw createApiError("NOT_FOUND", "PROJECT_TASK_NOT_FOUND");
            await requireStudioProject(studio, options.modules, context, task.projectId, "write");
            return callStudio(() =>
              studio.updateProjectTask({
                actorId: context.principal.user.id,
                taskId: input.taskId,
                ...(input.title !== undefined ? { title: input.title } : {}),
                ...(input.status !== undefined ? { status: input.status } : {}),
              }),
            );
          }),
      },
    },
    library: {
      search: os.library.search
        .use(requirePermission("workspace.assets.read"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          assertWorkspaceAccessConfigured(options.modules, context);
          if (input.projectId !== undefined) {
            await requireStudioProject(studio, options.modules, context, input.projectId, "read");
          }
          const result = await callStudio(() =>
            studio.searchLibrary({
              actorId: context.principal.user.id,
              limit: input.limit,
              ...(input.query !== undefined ? { query: input.query } : {}),
              ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
              ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
            }),
          );
          await assertWorkspaceCollectionAccess(
            options.modules,
            context,
            [
              ...result.assets.map((asset) => asset.workspaceId),
              ...result.versions.map((version) => version.workspaceId),
              ...result.projects.map((project) => project.workspaceId),
            ],
            "read",
          );
          return result;
        }),
      versions: {
        list: os.library.versions.list
          .use(requirePermission("workspace.assets.read"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            const workspaceId = await callStudio(() =>
              studio.getAssetWorkspace({
                actorId: context.principal.user.id,
                assetId: input.assetId,
              }),
            );
            if (!workspaceId) throw createApiError("NOT_FOUND", "ASSET_NOT_FOUND");
            await assertWorkspaceAccess(options.modules, context, workspaceId, "read");
            const page = await callStudio(() =>
              studio.listAssetVersions({
                actorId: context.principal.user.id,
                assetId: input.assetId,
                limit: input.limit,
                ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
              }),
            );
            await assertWorkspaceCollectionAccess(
              options.modules,
              context,
              page.items.map((version) => version.workspaceId),
              "read",
            );
            return page;
          }),
      },
    },
    reviews: {
      list: os.reviews.list
        .use(requirePermission("workspace.assets.read"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          await requireStudioProject(studio, options.modules, context, input.projectId, "read");
          const page = await callStudio(() =>
            studio.listReviews({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              limit: input.limit,
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
            }),
          );
          await assertWorkspaceCollectionAccess(
            options.modules,
            context,
            page.items.map((review) => review.workspaceId),
            "read",
          );
          return page;
        }),
      create: os.reviews.create
        .use(requirePermission("workspace.assets.write"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          await requireStudioProject(studio, options.modules, context, input.projectId, "write");
          const review = await callStudio(() =>
            studio.createReview({
              actorId: context.principal.user.id,
              projectId: input.projectId,
              targetVersionId: input.targetVersionId,
              title: input.title,
              idempotencyKey: input.idempotencyKey,
            }),
          );
          await assertWorkspaceAccess(options.modules, context, review.workspaceId, "write");
          return review;
        }),
      update: os.reviews.update
        .use(requirePermission("workspace.assets.write"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          await requireStudioReview(studio, options.modules, context, input.reviewId, "write");
          const review = await callStudio(() =>
            studio.updateReview({
              actorId: context.principal.user.id,
              reviewId: input.reviewId,
              status: input.status,
            }),
          );
          await assertWorkspaceAccess(options.modules, context, review.workspaceId, "write");
          return review;
        }),
      resolve: os.reviews.resolve
        .use(requirePermission("workspace.assets.write"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          await requireStudioReview(studio, options.modules, context, input.reviewId, "write");
          const review = await callStudio(() =>
            studio.resolveReview({
              actorId: context.principal.user.id,
              reviewId: input.reviewId,
            }),
          );
          await assertWorkspaceAccess(options.modules, context, review.workspaceId, "write");
          return review;
        }),
      feedback: {
        list: os.reviews.feedback.list
          .use(requirePermission("workspace.assets.read"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioReview(studio, options.modules, context, input.reviewId, "read");
            return callStudio(() =>
              studio.listFeedback({
                actorId: context.principal.user.id,
                reviewId: input.reviewId,
                limit: input.limit,
                ...(input.status !== undefined ? { status: input.status } : {}),
                ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
              }),
            );
          }),
        create: os.reviews.feedback.create
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioReview(studio, options.modules, context, input.reviewId, "write");
            return callStudio(() =>
              studio.createFeedback({
                actorId: context.principal.user.id,
                reviewId: input.reviewId,
                targetVersionId: input.targetVersionId,
                body: input.body,
                idempotencyKey: input.idempotencyKey,
              }),
            );
          }),
        update: os.reviews.feedback.update
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            const feedback = await callStudio(() =>
              studio.getFeedback({
                actorId: context.principal.user.id,
                feedbackId: input.feedbackId,
              }),
            );
            if (!feedback) throw createApiError("NOT_FOUND", "FEEDBACK_NOT_FOUND");
            await requireStudioProject(
              studio,
              options.modules,
              context,
              feedback.projectId,
              "write",
            );
            return callStudio(() =>
              studio.updateFeedback({
                actorId: context.principal.user.id,
                feedbackId: input.feedbackId,
                status: input.status,
              }),
            );
          }),
      },
    },
    activity: {
      list: os.activity.list
        .use(requirePermission("workspace.assets.read"))
        .handler(async ({ context, input }) => {
          const studio = requireStudioModule(options.modules);
          assertWorkspaceAccessConfigured(options.modules, context);
          if (input.projectId !== undefined) {
            await requireStudioProject(studio, options.modules, context, input.projectId, "read");
          }
          const page = await callStudio(() =>
            studio.listActivity({
              actorId: context.principal.user.id,
              limit: input.limit,
              ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
              ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
            }),
          );
          await assertWorkspaceCollectionAccess(
            options.modules,
            context,
            page.items.map((activity) => activity.workspaceId),
            "read",
          );
          return page;
        }),
    },
    pi: {
      sessions: {
        create: os.pi.sessions.create
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioProject(studio, options.modules, context, input.projectId, "write");
            const session = await callStudio(() =>
              studio.createPiSession({
                actorId: context.principal.user.id,
                projectId: input.projectId,
                prompt: input.prompt,
                context: input.context,
                idempotencyKey: input.idempotencyKey,
              }),
            );
            await assertWorkspaceAccess(options.modules, context, session.workspaceId, "write");
            return session;
          }),
        get: os.pi.sessions.get
          .use(requirePermission("workspace.agents.read"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            return requireStudioPiSession(
              studio,
              options.modules,
              context,
              input.sessionId,
              "read",
            );
          }),
        cancel: os.pi.sessions.cancel
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioPiSession(
              studio,
              options.modules,
              context,
              input.sessionId,
              "write",
            );
            const session = await callStudio(() =>
              studio.cancelPiSession({
                actorId: context.principal.user.id,
                sessionId: input.sessionId,
              }),
            );
            await assertWorkspaceAccess(options.modules, context, session.workspaceId, "write");
            return session;
          }),
        update: os.pi.sessions.update
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            const session = await requireStudioPiSession(
              studio,
              options.modules,
              context,
              input.sessionId,
              "write",
            );
            const updated = await callStudio(() =>
              studio.updatePiSession({
                actorId: context.principal.user.id,
                sessionId: input.sessionId,
                parameters: input.parameters,
              }),
            );
            await assertWorkspaceAccess(options.modules, context, session.workspaceId, "write");
            return updated;
          }),
        pause: os.pi.sessions.pause
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            const session = await callStudio(() =>
              studio.pausePiSession({
                actorId: context.principal.user.id,
                sessionId: input.sessionId,
              }),
            );
            await assertWorkspaceAccess(options.modules, context, session.workspaceId, "write");
            return session;
          }),
        resume: os.pi.sessions.resume
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            const session = await callStudio(() =>
              studio.resumePiSession({
                actorId: context.principal.user.id,
                sessionId: input.sessionId,
              }),
            );
            await assertWorkspaceAccess(options.modules, context, session.workspaceId, "write");
            return session;
          }),
        retry: os.pi.sessions.retry
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ context, input }) => {
            const studio = requireStudioModule(options.modules);
            await requireStudioPiSession(
              studio,
              options.modules,
              context,
              input.sessionId,
              "write",
            );
            const session = await callStudio(() =>
              studio.retryPiSession({
                actorId: context.principal.user.id,
                sessionId: input.sessionId,
                idempotencyKey: input.idempotencyKey,
              }),
            );
            await assertWorkspaceAccess(options.modules, context, session.workspaceId, "write");
            return session;
          }),
      },
    },
    remote: {
      commands: {
        create: os.remote.commands.create
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ context, input }) => {
            if (!options.modules.agents) {
              // Keep provider absence explicit; never report a command as queued
              // when no local Agent runtime is connected.
              throw createApiError("SERVICE_UNAVAILABLE", "REMOTE_COMMAND_UNAVAILABLE");
            }
            await assertWorkspaceAccess(options.modules, context, input.workspaceId, "write");
            try {
              return await options.modules.agents.createRun({
                workspaceId: input.workspaceId,
                requestedBy: context.principal.user.id,
                goal: input.instruction,
              });
            } catch (error) {
              throw mapDomainError(error);
            }
          }),
      },
    },
    scheduled: {
      tasks: {
        list: os.scheduled.tasks.list
          .use(requirePermission("workspace.agents.read"))
          .handler(async ({ input }) => {
            const repo = options.modules.scheduled;
            if (!repo) throw createApiError("SERVICE_UNAVAILABLE", "SCHEDULED_TASKS_UNAVAILABLE");
            return repo.list({
              workspaceId: input.workspaceId,
              limit: input.limit,
              ...(input.projectId ? { projectId: input.projectId } : {}),
              ...(input.cursor ? { cursor: input.cursor } : {}),
            });
          }),
        create: os.scheduled.tasks.create
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ context, input }) => {
            const repo = options.modules.scheduled;
            if (!repo) throw createApiError("SERVICE_UNAVAILABLE", "SCHEDULED_TASKS_UNAVAILABLE");
            return repo.create({
              workspaceId: input.workspaceId,
              projectId: input.projectId ?? null,
              createdBy: context.principal.user.id,
              name: input.name,
              instruction: input.instruction,
              schedule: input.schedule,
              status: "active",
              executionStatus: "unavailable",
              nextRunAt: null,
            });
          }),
        update: os.scheduled.tasks.update
          .use(requirePermission("workspace.agents.write"))
          .handler(async ({ input }) => {
            const repo = options.modules.scheduled;
            if (!repo) throw createApiError("SERVICE_UNAVAILABLE", "SCHEDULED_TASKS_UNAVAILABLE");
            return repo.update({
              id: input.taskId,
              ...(input.name ? { name: input.name } : {}),
              ...(input.instruction ? { instruction: input.instruction } : {}),
              ...(input.schedule ? { schedule: input.schedule } : {}),
              ...(input.status ? { status: input.status } : {}),
              ...(input.nextRunAt !== undefined ? { nextRunAt: input.nextRunAt } : {}),
            });
          }),
      },
    },
    public: {
      auth: {
        capabilities: {
          get: os.public.auth.capabilities.get.handler(() =>
            options.modules.publicAuthCapabilities.get(),
          ),
        },
      },
    },
    admin: {
      users: {
        list: os.admin.users.list
          .use(requirePermission("admin.users.read"))
          .handler(async ({ input }) => {
            return options.modules.users.list({
              limit: input.limit,
              ...(input.query ? { query: input.query } : {}),
              ...(input.cursor ? { cursor: input.cursor } : {}),
            });
          }),
        get: os.admin.users.get
          .use(requirePermission("admin.users.read"))
          .handler(async ({ input }) => {
            const user = await options.modules.users.get(input.userId);
            if (!user) throw createApiError("NOT_FOUND", "USER_NOT_FOUND");
            return user;
          }),
        updateStatus: os.admin.users.updateStatus
          .use(requirePermission("admin.users.write"))
          .handler(async ({ context, input }) => {
            const session = context.principal.session;
            context.log?.set({
              actor: { type: "user", id: session.user.id },
              target: { type: "user", id: input.userId },
              outcome: "started",
            });
            try {
              const updated = await options.modules.users.updateStatus({
                actorId: session.user.id,
                userId: input.userId,
                status: input.status,
              });
              context.log?.set({ outcome: "success" });
              return updated;
            } catch (error) {
              context.log?.set({ outcome: "failure" });
              throw mapDomainError(error);
            }
          }),
      },
      audit: {
        list: os.admin.audit.list
          .use(requirePermission("admin.audit.read"))
          .handler(async ({ input }) => {
            return options.modules.users.audit(input.limit);
          }),
      },
      settings: {
        auth: {
          get: os.admin.settings.auth.get
            .use(requirePermission("admin.settings.auth.read"))
            .handler(async () => {
              return options.modules.settings.auth.get();
            }),
          update: os.admin.settings.auth.update
            .use(requirePermission("admin.settings.auth.write"))
            .handler(async ({ context, input }) => {
              const session = context.principal.session;
              context.log?.set({
                actor: { type: "user", id: session.user.id },
                target: { type: "system_setting", id: "auth" },
                outcome: "started",
              });
              try {
                const updated = await options.modules.settings.auth.update({
                  actorId: session.user.id,
                  settings: {
                    ...(input.registrationMode !== undefined
                      ? { registrationMode: input.registrationMode }
                      : {}),
                    ...(input.allowedEmailDomains !== undefined
                      ? { allowedEmailDomains: input.allowedEmailDomains }
                      : {}),
                    ...(input.welcomeEmailEnabled !== undefined
                      ? { welcomeEmailEnabled: input.welcomeEmailEnabled }
                      : {}),
                    ...(input.verificationEmailEnabled !== undefined
                      ? { verificationEmailEnabled: input.verificationEmailEnabled }
                      : {}),
                    ...(input.passwordResetEmailEnabled !== undefined
                      ? { passwordResetEmailEnabled: input.passwordResetEmailEnabled }
                      : {}),
                  },
                });
                if (options.invalidateAuthSettings) await options.invalidateAuthSettings();
                context.log?.set({ outcome: "success" });
                return updated;
              } catch (error) {
                context.log?.set({ outcome: "failure" });
                throw mapDomainError(error);
              }
            }),
        },
        mail: {
          get: os.admin.settings.mail.get
            .use(requirePermission("admin.settings.mail.read"))
            .handler(async () => {
              return options.modules.settings.mail.get();
            }),
          update: os.admin.settings.mail.update
            .use(requirePermission("admin.settings.mail.write"))
            .handler(async ({ context, input }) => {
              const session = context.principal.session;
              if (input.resendApiKey) {
                assertPermission(context, "admin.settings.mail.secret.write");
              }
              context.log?.set({
                actor: { type: "user", id: session.user.id },
                target: { type: "system_setting", id: "mail" },
                outcome: "started",
              });
              try {
                const updated = await options.modules.settings.mail.update({
                  actorId: session.user.id,
                  settings: {
                    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
                    ...(input.from !== undefined ? { from: input.from } : {}),
                    ...(input.fromName !== undefined ? { fromName: input.fromName } : {}),
                    ...(input.templatesBaseUrl !== undefined
                      ? { templatesBaseUrl: input.templatesBaseUrl }
                      : {}),
                    ...(input.resendApiKey !== undefined
                      ? { resendApiKey: input.resendApiKey }
                      : {}),
                  },
                });
                context.log?.set({ outcome: "success" });
                return updated;
              } catch (error) {
                context.log?.set({ outcome: "failure" });
                throw mapDomainError(error);
              }
            }),
          sendTest: os.admin.settings.mail.sendTest
            .use(requirePermission("admin.settings.mail.test"))
            .handler(async ({ context }) => {
              const session = context.principal.session;
              context.log?.set({
                actor: { type: "user", id: session.user.id },
                target: { type: "system_setting", id: "mail" },
                outcome: "started",
              });
              try {
                const result = await options.modules.settings.mail.sendTest({
                  actorId: session.user.id,
                  recipient: { email: session.user.email, name: session.user.displayName },
                  ...(context.locale ? { locale: context.locale } : {}),
                });
                context.log?.set({ outcome: "success" });
                return result;
              } catch (error) {
                context.log?.set({ outcome: "failure" });
                throw mapDomainError(error);
              }
            }),
        },
      },
    },
    workspace: {
      assets: {
        create: os.workspace.assets.create
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            await assertWorkspaceAccess(options.modules, context, input.workspaceId, "write");
            const assets = requireAssets(options.modules);
            try {
              return await assets.create(input);
            } catch (error) {
              throw mapDomainError(error);
            }
          }),
        get: os.workspace.assets.get
          .use(requirePermission("workspace.assets.read"))
          .handler(async ({ context, input }) => {
            const assets = requireAssets(options.modules);
            try {
              const asset = await assets.get(input.assetId);
              if (!asset) throw createApiError("NOT_FOUND", "ASSET_NOT_FOUND");
              await assertWorkspaceAccess(options.modules, context, asset.workspaceId, "read");
              return asset;
            } catch (error) {
              throw mapDomainError(error);
            }
          }),
        commitVersion: os.workspace.assets.commitVersion
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            await assertWorkspaceAccess(options.modules, context, input.workspaceId, "write");
            const assets = requireAssets(options.modules);
            try {
              return await assets.commitVersion({
                workspaceId: input.workspaceId,
                assetId: input.assetId,
                blobHash: input.blobHash,
                byteSize: input.byteSize,
                expectedHeadVersionId: input.expectedHeadVersionId,
                parentVersionId: input.parentVersionId,
                idempotencyKey: input.idempotencyKey,
                ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
                ...(input.localVersionId !== undefined
                  ? { localVersionId: input.localVersionId }
                  : {}),
                actorId: context.principal.session.user.id,
              });
            } catch (error) {
              throw mapDomainError(error);
            }
          }),
        resolveConflict: os.workspace.assets.resolveConflict
          .use(requirePermission("workspace.assets.write"))
          .handler(async ({ context, input }) => {
            const assets = requireAssets(options.modules);
            try {
              const conflict = await assets.getConflict(input.conflictId);
              if (!conflict) throw createApiError("NOT_FOUND", "ASSET_CONFLICT_NOT_FOUND");
              await assertWorkspaceAccess(options.modules, context, conflict.workspaceId, "write");
              return await assets.resolveConflict({
                conflictId: input.conflictId,
                actorId: context.principal.session.user.id,
              });
            } catch (error) {
              throw mapDomainError(error);
            }
          }),
        upload: {
          create: os.workspace.assets.upload.create
            .use(requirePermission("workspace.assets.write"))
            .handler(async ({ context, input }) => {
              await assertWorkspaceAccess(options.modules, context, input.workspaceId, "write");
              try {
                return await requireBlob(options.modules).createUpload({
                  ...input,
                  actorId: context.principal.session.user.id,
                });
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
          complete: os.workspace.assets.upload.complete
            .use(requirePermission("workspace.assets.write"))
            .handler(async ({ context, input }) => {
              const { body, ...metadata } = input;
              try {
                return await requireBlob(options.modules).completeUpload({
                  ...metadata,
                  actorId: context.principal.session.user.id,
                  ...(body ? { body: Uint8Array.from(Buffer.from(body, "base64")) } : {}),
                });
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
        },
        download: {
          get: os.workspace.assets.download.get
            .use(requirePermission("workspace.assets.read"))
            .handler(async ({ context, input }) => {
              await assertWorkspaceAccess(options.modules, context, input.workspaceId, "read");
              const result = await requireBlob(options.modules).getDownload(input);
              if (!result) throw createApiError("NOT_FOUND", "BLOB_NOT_FOUND");
              const chunks: number[] = [];
              for await (const chunk of result.body) chunks.push(...chunk);
              return {
                blobHash: result.blobHash,
                byteSize: result.byteSize,
                contentType: result.contentType,
                body: Buffer.from(chunks).toString("base64"),
              };
            }),
        },
      },
      agents: {
        runs: {
          create: os.workspace.agents.runs.create
            .use(requirePermission("workspace.agents.write"))
            .handler(async ({ context, input }) => {
              await assertWorkspaceAccess(options.modules, context, input.workspaceId, "write");
              const agents = requireAgents(options.modules);
              try {
                return await agents.createRun({
                  ...input,
                  requestedBy: context.principal.session.user.id,
                });
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
          get: os.workspace.agents.runs.get
            .use(requirePermission("workspace.agents.read"))
            .handler(async ({ context, input }) => {
              const agents = requireAgents(options.modules);
              try {
                const run = await agents.getRun(input.runId);
                if (!run) throw createApiError("NOT_FOUND", "AGENT_RUN_NOT_FOUND");
                await assertWorkspaceAccess(options.modules, context, run.workspaceId, "read");
                return run;
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
          transition: os.workspace.agents.runs.transition
            .use(requirePermission("workspace.agents.write"))
            .handler(async ({ context, input }) => {
              const agents = requireAgents(options.modules);
              try {
                const run = await agents.getRun(input.runId);
                if (!run) throw createApiError("NOT_FOUND", "AGENT_RUN_NOT_FOUND");
                await assertWorkspaceAccess(options.modules, context, run.workspaceId, "write");
                return await agents.transitionRun(input);
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
          acquireLease: os.workspace.agents.runs.acquireLease
            .use(requirePermission("workspace.agents.write"))
            .handler(async ({ context, input }) => {
              const agents = requireAgents(options.modules);
              try {
                const run = await agents.getRun(input.runId);
                if (!run) throw createApiError("NOT_FOUND", "AGENT_RUN_NOT_FOUND");
                await assertWorkspaceAccess(options.modules, context, run.workspaceId, "write");
                return await agents.acquireLease(input);
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
          heartbeat: os.workspace.agents.runs.heartbeat
            .use(requirePermission("workspace.agents.write"))
            .handler(async ({ context, input }) => {
              const agents = requireAgents(options.modules);
              try {
                const run = await agents.getRun(input.runId);
                if (!run) throw createApiError("NOT_FOUND", "AGENT_RUN_NOT_FOUND");
                await assertWorkspaceAccess(options.modules, context, run.workspaceId, "write");
                return await agents.heartbeat(input);
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
        },
        steps: {
          create: os.workspace.agents.steps.create
            .use(requirePermission("workspace.agents.write"))
            .handler(async ({ context, input }) => {
              const agents = requireAgents(options.modules);
              try {
                const run = await agents.getRun(input.runId);
                if (!run) throw createApiError("NOT_FOUND", "AGENT_RUN_NOT_FOUND");
                await assertWorkspaceAccess(options.modules, context, run.workspaceId, "write");
                return await agents.createStep(input);
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
          transition: os.workspace.agents.steps.transition
            .use(requirePermission("workspace.agents.write"))
            .handler(async ({ context, input }) => {
              const agents = requireAgents(options.modules);
              try {
                const step = await agents.getStep(input.stepId);
                if (!step) throw createApiError("NOT_FOUND", "AGENT_STEP_NOT_FOUND");
                const run = await agents.getRun(step.runId);
                if (!run) throw createApiError("NOT_FOUND", "AGENT_RUN_NOT_FOUND");
                await assertWorkspaceAccess(options.modules, context, run.workspaceId, "write");
                return await agents.transitionStep({
                  stepId: input.stepId,
                  status: input.status,
                  ...(input.error !== undefined ? { error: input.error } : {}),
                });
              } catch (error) {
                throw mapDomainError(error);
              }
            }),
        },
      },
    },
  });
}

function requireAssets(modules: ApiModules) {
  if (!modules.assets) throw createApiError("INTERNAL_SERVER_ERROR", "ASSETS_NOT_CONFIGURED");
  return modules.assets;
}

function requireBlob(modules: ApiModules) {
  if (!modules.blobStorage)
    throw createApiError("INTERNAL_SERVER_ERROR", "BLOB_STORAGE_NOT_CONFIGURED");
  return modules.blobStorage;
}

function requireAgents(modules: ApiModules) {
  if (!modules.agents) throw createApiError("INTERNAL_SERVER_ERROR", "AGENTS_NOT_CONFIGURED");
  return modules.agents;
}

function requireV2Projects(modules: ApiModules) {
  if (!modules.v2Projects)
    throw createApiError("INTERNAL_SERVER_ERROR", "V2_PROJECTS_NOT_CONFIGURED");
  return modules.v2Projects;
}

type StudioModule = NonNullable<ApiModules["studio"]>;

function requireStudioModule(modules: ApiModules): StudioModule {
  if (!modules.studio) {
    throw createApiError("INTERNAL_SERVER_ERROR", "PROJECT_STUDIO_NOT_CONFIGURED");
  }
  return modules.studio;
}

async function callStudio<Result>(operation: () => Promise<Result>): Promise<Result> {
  try {
    return await operation();
  } catch (error) {
    throw mapDomainError(error);
  }
}

async function callV2<Result>(operation: () => Promise<Result>): Promise<Result> {
  try {
    return await operation();
  } catch (error) {
    throw mapDomainError(error);
  }
}

function assertWorkspaceAccessConfigured(modules: ApiModules, context: ApiContext): void {
  if (modules.workspaceAccess) return;
  const session = context.auth.session;
  context.log?.set({
    actor: session ? { type: "user", id: session.user.id } : null,
    permissionResult: "denied",
    reason: "workspace_access_not_configured",
  });
  throw createApiError("FORBIDDEN", "WORKSPACE_ACCESS_NOT_CONFIGURED");
}

async function assertWorkspaceCollectionAccess(
  modules: ApiModules,
  context: ApiContext,
  workspaceIds: readonly string[],
  access: "read" | "write",
): Promise<void> {
  assertWorkspaceAccessConfigured(modules, context);
  for (const workspaceId of new Set(workspaceIds)) {
    await assertWorkspaceAccess(modules, context, workspaceId, access);
  }
}

async function requireStudioProject(
  studio: StudioModule,
  modules: ApiModules,
  context: ApiContext,
  projectId: string,
  access: "read" | "write",
) {
  const session = context.auth.session;
  if (!session) throw createApiError("UNAUTHORIZED");
  const project = await callStudio(() =>
    studio.getProject({ actorId: session.user.id, projectId }),
  );
  if (!project) throw createApiError("NOT_FOUND", "PROJECT_NOT_FOUND");
  await assertWorkspaceAccess(modules, context, project.workspaceId, access);
  return project;
}

async function requireStudioReview(
  studio: StudioModule,
  modules: ApiModules,
  context: ApiContext,
  reviewId: string,
  access: "read" | "write",
) {
  const session = context.auth.session;
  if (!session) throw createApiError("UNAUTHORIZED");
  const review = await callStudio(() => studio.getReview({ actorId: session.user.id, reviewId }));
  if (!review) throw createApiError("NOT_FOUND", "REVIEW_NOT_FOUND");
  await assertWorkspaceAccess(modules, context, review.workspaceId, access);
  return review;
}

async function requireStudioPiSession(
  studio: StudioModule,
  modules: ApiModules,
  context: ApiContext,
  sessionId: string,
  access: "read" | "write",
) {
  const session = context.auth.session;
  if (!session) throw createApiError("UNAUTHORIZED");
  const piSession = await callStudio(() =>
    studio.getPiSession({ actorId: session.user.id, sessionId }),
  );
  if (!piSession) throw createApiError("NOT_FOUND", "PI_SESSION_NOT_FOUND");
  await assertWorkspaceAccess(modules, context, piSession.workspaceId, access);
  return piSession;
}

async function assertWorkspaceAccess(
  modules: ApiModules,
  context: ApiContext,
  workspaceId: string,
  access: "read" | "write",
): Promise<void> {
  const session = context.auth.session;
  if (!session) throw createApiError("UNAUTHORIZED");
  assertWorkspaceAccessConfigured(modules, context);
  const workspaceAccess = modules.workspaceAccess;
  if (!workspaceAccess) throw createApiError("FORBIDDEN", "WORKSPACE_ACCESS_NOT_CONFIGURED");
  try {
    if (access === "read") {
      await workspaceAccess.assertRead({ actorId: session.user.id, workspaceId });
    } else {
      await workspaceAccess.assertWrite({ actorId: session.user.id, workspaceId });
    }
  } catch (error) {
    throw mapDomainError(error);
  }
}

function assertPermission(context: ApiContext, permission: Permission): Session {
  const session = context.auth.session;
  context.log?.set({
    user: session ? { id: session.user.id, role: session.user.role } : null,
    permission: { name: permission },
    permissionResult: session && hasPermission(session, permission) ? "granted" : "denied",
  });
  if (!session) throw createApiError("UNAUTHORIZED");
  if (!hasPermission(session, permission)) throw createApiError("FORBIDDEN");
  return session;
}

function mapDomainError(error: unknown): ORPCError<string, unknown> {
  if (error instanceof ORPCError) return error;
  if (error instanceof WorkspaceAccessError) return toApiError("FORBIDDEN", error);
  if (error instanceof MailUnavailableError) {
    return new ORPCError("MAIL_NOT_CONFIGURED", {
      data: { error: { code: "MAIL_NOT_CONFIGURED" }, missing: error.missing },
      cause: error,
    });
  }
  if (error instanceof AssetDomainError || error instanceof AgentDomainError) {
    switch (error.code) {
      case "ASSET_NOT_FOUND":
      case "ASSET_VERSION_NOT_FOUND":
      case "ASSET_CONFLICT_NOT_FOUND":
      case "AGENT_RUN_NOT_FOUND":
      case "AGENT_STEP_NOT_FOUND":
      case "AGENT_LEASE_NOT_FOUND":
        return toApiError("NOT_FOUND", error);
      case "ASSET_PATH_CONFLICT":
      case "ASSET_HEAD_CONFLICT":
      case "ASSET_PARENT_CONFLICT":
      case "ASSET_ALREADY_DELETED":
      case "ASSET_IDEMPOTENCY_CONFLICT":
      case "ASSET_CONFLICT_ALREADY_RESOLVED":
      case "AGENT_INVALID_STATUS_TRANSITION":
      case "AGENT_CONCURRENT_MODIFICATION":
      case "AGENT_TERMINAL_RUN":
      case "AGENT_LEASE_HELD":
      case "AGENT_LEASE_EXPIRED":
      case "AGENT_LEASE_OWNER":
        return toApiError("CONFLICT", error);
      case "ASSET_PATH_INVALID":
      case "ASSET_INVALID_VERSION":
      case "BLOB_TOO_LARGE":
      case "BLOB_UNSUPPORTED_MEDIA_TYPE":
      case "BLOB_CHECKSUM_MISMATCH":
      case "BLOB_UPLOAD_EXPIRED":
      case "AGENT_TOOL_NOT_ALLOWED":
      case "AGENT_INVALID_INPUT":
        return toApiError("BAD_REQUEST", error);
      case "BLOB_NOT_FOUND":
        return toApiError("NOT_FOUND", error);
    }
    return toInternalError(error);
  }
  if (error instanceof ProjectDomainError) {
    switch (error.code) {
      case "PROJECT_NOT_FOUND":
        return toApiError("NOT_FOUND", error);
      case "PROJECT_INVALID_STAGE_TRANSITION":
      case "PROJECT_INVALID_LIFECYCLE_UPDATE":
        return toApiError("CONFLICT", error);
    }
    return toInternalError(error);
  }
  if (error instanceof ProjectV2DomainError) {
    switch (error.code) {
      case "PROJECT_MEMBER_NOT_FOUND":
        return toApiError("NOT_FOUND", error);
      case "PROJECT_MEMBER_INVALID_ROLE":
      case "PROJECT_SCOPE_INVALID":
        return toApiError("BAD_REQUEST", error);
      case "PROJECT_ACCESS_DENIED":
        return toApiError("FORBIDDEN", error);
    }
  }
  if (error instanceof ProjectStudioDomainError) {
    switch (error.code) {
      case "REVIEW_NOT_FOUND":
      case "FEEDBACK_NOT_FOUND":
      case "PI_SESSION_NOT_FOUND":
        return toApiError("NOT_FOUND", error);
      case "REVIEW_INVALID_STATUS_TRANSITION":
      case "FEEDBACK_INVALID_STATUS_TRANSITION":
        return toApiError("CONFLICT", error);
      case "PROJECT_MEMBER_NOT_FOUND":
        return toApiError("NOT_FOUND", error);
    }
    return toInternalError(error);
  }
  if (!(error instanceof DomainError)) {
    return toInternalError(error);
  }

  switch (error.code) {
    case "USER_NOT_FOUND":
      return toApiError("NOT_FOUND", error);
    case "SELF_SUSPENSION":
    case "LAST_ADMIN":
      return toApiError("CONFLICT", error);
    case "EMAIL_ALREADY_EXISTS":
      return toApiError("CONFLICT", error);
    case "BAD_REQUEST":
      return toApiError("BAD_REQUEST", error);
    case "MAIL_NOT_CONFIGURED":
      return new ORPCError("MAIL_NOT_CONFIGURED", {
        data: { error: { code: error.code }, missing: [] },
        cause: error,
      });
  }
  return toInternalError(error);
}

type ApiErrorValues = Record<string, string | number | boolean | null>;

function createApiError(
  transportCode: string,
  detailCode = transportCode,
  values?: ApiErrorValues,
): ORPCError<string, unknown> {
  return new ORPCError(transportCode, {
    data: {
      error: {
        code: detailCode,
        ...(values ? { values } : {}),
      },
    },
  });
}

function toApiError(
  transportCode: string,
  error: { code: string; values?: ApiErrorValues | undefined },
) {
  const mapped = createApiError(transportCode, error.code, error.values);
  return new ORPCError(mapped.code, { data: mapped.data, cause: error });
}

function toInternalError(cause: unknown) {
  const mapped = createApiError("INTERNAL_SERVER_ERROR");
  return new ORPCError(mapped.code, { data: mapped.data, cause });
}
