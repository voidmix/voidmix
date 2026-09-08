import { hasPermission, type Permission, type Session } from "@voidmix/auth";
import { apiContract } from "@voidmix/contracts";
import {
  AgentDomainError,
  AssetDomainError,
  DomainError,
  ProjectDomainError,
  ProjectStudioDomainError,
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
      throw new ORPCError("UNAUTHORIZED");
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
      if (!granted) throw new ORPCError("FORBIDDEN");
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
            if (!task) throw new ORPCError("NOT_FOUND", { message: "Project task not found." });
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
            if (!workspaceId) throw new ORPCError("NOT_FOUND", { message: "Asset not found." });
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
            if (!feedback)
              throw new ORPCError("NOT_FOUND", { message: "Review feedback not found." });
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
            if (!user) throw new ORPCError("NOT_FOUND", { message: "User not found." });
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
              if (!asset) throw new ORPCError("NOT_FOUND", { message: "Asset not found." });
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
              if (!conflict) throw new ORPCError("NOT_FOUND", { message: "Conflict not found." });
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
              if (!result) throw new ORPCError("NOT_FOUND", { message: "Blob not found." });
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
                if (!run) throw new ORPCError("NOT_FOUND", { message: "Agent run not found." });
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
                if (!run) throw new ORPCError("NOT_FOUND", { message: "Agent run not found." });
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
                if (!run) throw new ORPCError("NOT_FOUND", { message: "Agent run not found." });
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
                if (!run) throw new ORPCError("NOT_FOUND", { message: "Agent run not found." });
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
                if (!run) throw new ORPCError("NOT_FOUND", { message: "Agent run not found." });
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
                if (!step) throw new ORPCError("NOT_FOUND", { message: "Agent step not found." });
                const run = await agents.getRun(step.runId);
                if (!run) throw new ORPCError("NOT_FOUND", { message: "Agent run not found." });
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
  if (!modules.assets)
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Assets module is not configured." });
  return modules.assets;
}

function requireBlob(modules: ApiModules) {
  if (!modules.blobStorage)
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Blob storage is not configured." });
  return modules.blobStorage;
}

function requireAgents(modules: ApiModules) {
  if (!modules.agents)
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Agents module is not configured." });
  return modules.agents;
}

type StudioModule = NonNullable<ApiModules["studio"]>;

function requireStudioModule(modules: ApiModules): StudioModule {
  if (!modules.studio) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Project Studio module is not configured.",
    });
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

function assertWorkspaceAccessConfigured(modules: ApiModules, context: ApiContext): void {
  if (modules.workspaceAccess) return;
  const session = context.auth.session;
  context.log?.set({
    actor: session ? { type: "user", id: session.user.id } : null,
    permissionResult: "denied",
    reason: "workspace_access_not_configured",
  });
  throw new ORPCError("FORBIDDEN", { message: "Workspace access is not configured." });
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
  if (!session) throw new ORPCError("UNAUTHORIZED");
  const project = await callStudio(() =>
    studio.getProject({ actorId: session.user.id, projectId }),
  );
  if (!project) throw new ORPCError("NOT_FOUND", { message: "Project not found." });
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
  if (!session) throw new ORPCError("UNAUTHORIZED");
  const review = await callStudio(() => studio.getReview({ actorId: session.user.id, reviewId }));
  if (!review) throw new ORPCError("NOT_FOUND", { message: "Review not found." });
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
  if (!session) throw new ORPCError("UNAUTHORIZED");
  const piSession = await callStudio(() =>
    studio.getPiSession({ actorId: session.user.id, sessionId }),
  );
  if (!piSession) throw new ORPCError("NOT_FOUND", { message: "Pi session not found." });
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
  if (!session) throw new ORPCError("UNAUTHORIZED");
  assertWorkspaceAccessConfigured(modules, context);
  const workspaceAccess = modules.workspaceAccess;
  if (!workspaceAccess) throw new ORPCError("FORBIDDEN");
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
  if (!session) throw new ORPCError("UNAUTHORIZED");
  if (!hasPermission(session, permission)) throw new ORPCError("FORBIDDEN");
  return session;
}

function mapDomainError(error: unknown): ORPCError<string, unknown> {
  if (error instanceof ORPCError) return error;
  if (error instanceof WorkspaceAccessError) {
    return new ORPCError("FORBIDDEN", { message: error.message, cause: error });
  }
  if (error instanceof MailUnavailableError) {
    return new ORPCError("MAIL_NOT_CONFIGURED", {
      message: error.message,
      data: { missing: error.missing },
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
        return new ORPCError("NOT_FOUND", { message: error.message, cause: error });
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
        return new ORPCError("CONFLICT", { message: error.message, cause: error });
      case "ASSET_PATH_INVALID":
      case "ASSET_INVALID_VERSION":
      case "BLOB_TOO_LARGE":
      case "BLOB_UNSUPPORTED_MEDIA_TYPE":
      case "BLOB_CHECKSUM_MISMATCH":
      case "BLOB_UPLOAD_EXPIRED":
      case "AGENT_TOOL_NOT_ALLOWED":
      case "AGENT_INVALID_INPUT":
        return new ORPCError("BAD_REQUEST", { message: error.message, cause: error });
      case "BLOB_NOT_FOUND":
        return new ORPCError("NOT_FOUND", { message: error.message, cause: error });
    }
    return new ORPCError("INTERNAL_SERVER_ERROR", { cause: error });
  }
  if (error instanceof ProjectDomainError) {
    switch (error.code) {
      case "PROJECT_NOT_FOUND":
        return new ORPCError("NOT_FOUND", { message: error.message, cause: error });
      case "PROJECT_INVALID_STAGE_TRANSITION":
      case "PROJECT_INVALID_LIFECYCLE_UPDATE":
        return new ORPCError("CONFLICT", { message: error.message, cause: error });
    }
    return new ORPCError("INTERNAL_SERVER_ERROR", { cause: error });
  }
  if (error instanceof ProjectStudioDomainError) {
    switch (error.code) {
      case "REVIEW_NOT_FOUND":
      case "FEEDBACK_NOT_FOUND":
      case "PI_SESSION_NOT_FOUND":
        return new ORPCError("NOT_FOUND", { message: error.message, cause: error });
      case "REVIEW_INVALID_STATUS_TRANSITION":
      case "FEEDBACK_INVALID_STATUS_TRANSITION":
        return new ORPCError("CONFLICT", { message: error.message, cause: error });
      case "PROJECT_MEMBER_NOT_FOUND":
        return new ORPCError("NOT_FOUND", { message: error.message, cause: error });
    }
    return new ORPCError("INTERNAL_SERVER_ERROR", { cause: error });
  }
  if (!(error instanceof DomainError)) {
    return new ORPCError("INTERNAL_SERVER_ERROR", { cause: error });
  }

  switch (error.code) {
    case "USER_NOT_FOUND":
      return new ORPCError("NOT_FOUND", { message: error.message, cause: error });
    case "SELF_SUSPENSION":
    case "LAST_ADMIN":
      return new ORPCError("CONFLICT", { message: error.message, cause: error });
    case "EMAIL_ALREADY_EXISTS":
      return new ORPCError("CONFLICT", { message: error.message, cause: error });
    case "BAD_REQUEST":
      return new ORPCError("BAD_REQUEST", { message: error.message, cause: error });
    case "MAIL_NOT_CONFIGURED":
      return new ORPCError("MAIL_NOT_CONFIGURED", {
        message: error.message,
        data: { missing: [] },
        cause: error,
      });
  }
  return new ORPCError("INTERNAL_SERVER_ERROR", { cause: error });
}
