import { hasPermission, type Permission, type Session } from "@voidmix/auth";
import { apiContract } from "@voidmix/contracts";
import {
  createAuthSettingsAdministration,
  createMailSettingsAdministration,
  createPublicAuthCapabilities,
  createUserAdministration,
  DomainError,
  type AuthSettings,
  type MailSettingsFallback,
  type SystemSettingsRepository,
  type UserRepository,
} from "@voidmix/domain";
import { MailUnavailableError } from "@voidmix/mail/server";
import type { Mailer } from "@voidmix/mail/types";
import { implement, ORPCError } from "@orpc/server";
import type {
  RequestHeadersHandlerPluginContext,
  ResponseHeadersHandlerPluginContext,
} from "@orpc/server/plugins";
import { evlog as orpcEvlog, type EvlogOrpcContext } from "@voidmix/logger/orpc";

export interface ApiContext
  extends RequestHeadersHandlerPluginContext, ResponseHeadersHandlerPluginContext {
  requestId: string;
  session: Session | null;
  log?: EvlogOrpcContext["log"];
}

export interface CreateApiRouterOptions {
  users: UserRepository;
  settings: SystemSettingsRepository;
  mailFallback: MailSettingsFallback;
  mailer: Mailer;
  now?: () => Date;
  id?: () => string;
  resolveAuthSettings?: () => Promise<AuthSettings>;
  invalidateAuthSettings?: () => Promise<void>;
}

export function createApiRouter(options: CreateApiRouterOptions) {
  const administration = createUserAdministration({
    users: options.users,
    ...(options.now ? { now: options.now } : {}),
    ...(options.id ? { id: options.id } : {}),
  });
  const mailSettings = createMailSettingsAdministration({
    settings: options.settings,
    fallback: options.mailFallback,
    sendTest: (recipient) => options.mailer.sendTest(recipient),
    ...(options.now ? { now: options.now } : {}),
    ...(options.id ? { id: options.id } : {}),
  });
  const authSettings = createAuthSettingsAdministration({
    settings: options.settings,
    ...(options.now ? { now: options.now } : {}),
    ...(options.id ? { id: options.id } : {}),
  });
  const publicAuthCapabilities = createPublicAuthCapabilities({
    settings: options.settings,
    mailFallback: options.mailFallback,
    ...(options.resolveAuthSettings ? { resolveAuthSettings: options.resolveAuthSettings } : {}),
  });
  const os = implement(apiContract)
    .$context<ApiContext>()
    .use(orpcEvlog())
    .use(async ({ context, next }) => {
      context.log?.set({ requestId: context.requestId });
      context.resHeaders?.set("x-request-id", context.requestId);
      return next();
    });

  return os.router({
    health: os.health.handler(() => ({
      status: "ok" as const,
      timestamp: options.now?.() ?? new Date(),
    })),
    public: {
      auth: {
        capabilities: {
          get: os.public.auth.capabilities.get.handler(() => publicAuthCapabilities.get()),
        },
      },
    },
    admin: {
      users: {
        list: os.admin.users.list.handler(async ({ context, input }) => {
          requirePermission(context, "admin.users.read");
          return administration.list({
            limit: input.limit,
            ...(input.query ? { query: input.query } : {}),
            ...(input.cursor ? { cursor: input.cursor } : {}),
          });
        }),
        get: os.admin.users.get.handler(async ({ context, input }) => {
          requirePermission(context, "admin.users.read");
          const user = await administration.get(input.userId);
          if (!user) throw new ORPCError("NOT_FOUND", { message: "User not found." });
          return user;
        }),
        updateStatus: os.admin.users.updateStatus.handler(async ({ context, input }) => {
          const session = requirePermission(context, "admin.users.write");
          context.log?.set({
            actor: { type: "user", id: session.user.id },
            target: { type: "user", id: input.userId },
            outcome: "started",
          });
          try {
            const updated = await administration.updateStatus({
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
        list: os.admin.audit.list.handler(async ({ context, input }) => {
          requirePermission(context, "admin.audit.read");
          return administration.audit(input.limit);
        }),
      },
      settings: {
        auth: {
          get: os.admin.settings.auth.get.handler(async ({ context }) => {
            requirePermission(context, "admin.settings.auth.read");
            return authSettings.get();
          }),
          update: os.admin.settings.auth.update.handler(async ({ context, input }) => {
            const session = requirePermission(context, "admin.settings.auth.write");
            context.log?.set({
              actor: { type: "user", id: session.user.id },
              target: { type: "system_setting", id: "auth" },
              outcome: "started",
            });
            try {
              const updated = await authSettings.update({
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
          get: os.admin.settings.mail.get.handler(async ({ context }) => {
            requirePermission(context, "admin.settings.mail.read");
            return mailSettings.get();
          }),
          update: os.admin.settings.mail.update.handler(async ({ context, input }) => {
            const session = requirePermission(context, "admin.settings.mail.write");
            if (input.resendApiKey) {
              requirePermission(context, "admin.settings.mail.secret.write");
            }
            context.log?.set({
              actor: { type: "user", id: session.user.id },
              target: { type: "system_setting", id: "mail" },
              outcome: "started",
            });
            try {
              const updated = await mailSettings.update({
                actorId: session.user.id,
                settings: {
                  ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
                  ...(input.from !== undefined ? { from: input.from } : {}),
                  ...(input.fromName !== undefined ? { fromName: input.fromName } : {}),
                  ...(input.templatesBaseUrl !== undefined
                    ? { templatesBaseUrl: input.templatesBaseUrl }
                    : {}),
                  ...(input.resendApiKey !== undefined ? { resendApiKey: input.resendApiKey } : {}),
                },
              });
              context.log?.set({ outcome: "success" });
              return updated;
            } catch (error) {
              context.log?.set({ outcome: "failure" });
              throw mapDomainError(error);
            }
          }),
          sendTest: os.admin.settings.mail.sendTest.handler(async ({ context }) => {
            const session = requirePermission(context, "admin.settings.mail.test");
            context.log?.set({
              actor: { type: "user", id: session.user.id },
              target: { type: "system_setting", id: "mail" },
              outcome: "started",
            });
            try {
              const result = await mailSettings.sendTest({
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
  });
}

function requirePermission(context: ApiContext, permission: Permission): Session {
  const session = context.session;
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
  if (error instanceof MailUnavailableError) {
    return new ORPCError("MAIL_NOT_CONFIGURED", {
      message: error.message,
      data: { missing: error.missing },
      cause: error,
    });
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
}
