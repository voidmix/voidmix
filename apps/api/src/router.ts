import { hasPermission, type Permission, type Session } from "@voidmix/auth";
import { apiContract } from "@voidmix/contracts";
import { createUserAdministration, DomainError, type UserRepository } from "@voidmix/domain";
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
  now?: () => Date;
  id?: () => string;
}

export function createApiRouter(options: CreateApiRouterOptions) {
  const administration = createUserAdministration({
    users: options.users,
    ...(options.now ? { now: options.now } : {}),
    ...(options.id ? { id: options.id } : {}),
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
  }
}
