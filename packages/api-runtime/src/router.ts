import { hasPermission, type Permission, type Session } from "@voidmix/auth";
import { apiContract } from "@voidmix/contracts";
import {
  AgentDomainError,
  AssetDomainError,
  DomainError,
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

function requireAgents(modules: ApiModules) {
  if (!modules.agents)
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Agents module is not configured." });
  return modules.agents;
}

async function assertWorkspaceAccess(
  modules: ApiModules,
  context: ApiContext,
  workspaceId: string,
  access: "read" | "write",
): Promise<void> {
  const session = context.auth.session;
  if (!session) throw new ORPCError("UNAUTHORIZED");
  const workspaceAccess = modules.workspaceAccess;
  if (!workspaceAccess) {
    context.log?.set({
      actor: { type: "user", id: session.user.id },
      workspace: { id: workspaceId },
      access,
      permissionResult: "denied",
      reason: "workspace_access_not_configured",
    });
    throw new ORPCError("FORBIDDEN", { message: "Workspace access is not configured." });
  }
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
      case "AGENT_TOOL_NOT_ALLOWED":
      case "AGENT_INVALID_INPUT":
        return new ORPCError("BAD_REQUEST", { message: error.message, cause: error });
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
