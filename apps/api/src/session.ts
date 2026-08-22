import type { Role, Session } from "@voidmix/auth";

import { env, type ApiEnvironment } from "./env.js";

const validRoles = new Set<Role>(["user", "admin", "owner"]);

export type SessionResolver = (request: Request) => Promise<Session | null>;

/**
 * Development-only authentication adapter. Production should replace this
 * with a Better Auth session resolver without changing the API router.
 */
export function createHeaderSessionResolver(
  options: { env?: ApiEnvironment } = {},
): SessionResolver {
  const environment = options.env ?? env;

  return async (request) => {
    const id = request.headers.get("x-voidmix-user-id") ?? environment.VOIDMIX_ACTOR_ID;
    if (!id) return null;

    const requestedRole = request.headers.get("x-voidmix-role") ?? environment.VOIDMIX_ACTOR_ROLE;
    const role: Role = validRoles.has(requestedRole as Role) ? (requestedRole as Role) : "user";

    return {
      user: {
        id,
        email: request.headers.get("x-voidmix-email") ?? `${id}@example.invalid`,
        displayName: request.headers.get("x-voidmix-display-name") ?? id,
        role,
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  };
}

export const resolveHeaderSession = createHeaderSessionResolver();
