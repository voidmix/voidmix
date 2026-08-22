import { createApiClient } from "@voidmix/client";
import { log } from "@voidmix/logger/client";

import { env } from "../../env.js";

export type UserRole = "owner" | "admin" | "user";
export type UserStatus = "active" | "suspended";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string;
  joinedAt: string;
}

export interface UserListInput {
  query?: string;
  status?: UserStatus;
}

export interface AdminUsersClient {
  listUsers(input: UserListInput): Promise<readonly AdminUser[]>;
  updateUserStatus(input: { userId: string; status: "active" | "suspended" }): Promise<AdminUser>;
}

const seedUsers: AdminUser[] = [
  {
    id: "owner-local",
    name: "Mina Cole",
    email: "owner@voidmix.local",
    role: "owner",
    status: "active",
    lastActive: "2 min ago",
    joinedAt: "May 18, 2026",
  },
  {
    id: "admin-local",
    name: "Leo Wang",
    email: "admin@voidmix.local",
    role: "admin",
    status: "active",
    lastActive: "18 min ago",
    joinedAt: "Jun 04, 2026",
  },
  {
    id: "user-local",
    name: "Samira Bell",
    email: "user@voidmix.local",
    role: "user",
    status: "active",
    lastActive: "1 hr ago",
    joinedAt: "Jun 21, 2026",
  },
  {
    id: "usr_suspended",
    name: "Rei Nakamura",
    email: "rei@monoform.jp",
    role: "user",
    status: "suspended",
    lastActive: "9 days ago",
    joinedAt: "Apr 07, 2026",
  },
];

const api = createApiClient({
  baseUrl: env.VITE_API_URL,
  headers: {
    "x-voidmix-user-id": env.VITE_ACTOR_ID,
    "x-voidmix-role": env.VITE_ACTOR_ROLE,
    "x-voidmix-email": "owner@voidmix.local",
  },
});

function toAdminUser(user: {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}): AdminUser {
  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    role: user.role,
    status: user.status,
    lastActive: "Connected",
    joinedAt: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(user.createdAt),
  };
}

export const adminUsersClient: AdminUsersClient = {
  async listUsers(input) {
    try {
      const page = await api.admin.users.list({
        ...(input.query ? { query: input.query } : {}),
        limit: 100,
      });
      return page.items
        .map(toAdminUser)
        .filter((user) => !input.status || user.status === input.status);
    } catch {
      log.warn({
        event: "admin.users.list.fallback",
        reason: "api_unavailable",
      });
      const query = input.query?.trim().toLowerCase();
      return seedUsers.filter((user) => {
        const matchesQuery =
          !query ||
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query);
        return matchesQuery && (!input.status || user.status === input.status);
      });
    }
  },
  async updateUserStatus(input) {
    try {
      return toAdminUser(await api.admin.users.updateStatus(input));
    } catch {
      const user = seedUsers.find((candidate) => candidate.id === input.userId);
      if (!user) {
        log.error({
          event: "admin.users.update.failed",
          reason: "user_not_found",
        });
        throw new Error("User not found");
      }
      log.warn({
        event: "admin.users.update.fallback",
        reason: "api_unavailable",
      });
      user.status = input.status;
      return { ...user };
    }
  },
};
