import { createApiClient, type ApiClient } from "@voidmix/client";

import type { AdminUser, AdminUsersClient, UserRole, UserStatus } from "./types";

type ApiUser = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
};

export function toAdminUser(user: ApiUser): AdminUser {
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

function createConfiguredApiClient() {
  return createApiClient({
    fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
  });
}

export function createApiUsersAdapter(
  api: ApiClient = createConfiguredApiClient(),
): AdminUsersClient {
  return {
    async listUsers(input) {
      const page = await api.admin.users.list({
        ...(input.query ? { query: input.query } : {}),
        limit: 100,
      });
      return page.items
        .map(toAdminUser)
        .filter((user) => !input.status || user.status === input.status);
    },
    async updateUserStatus(input) {
      return toAdminUser(await api.admin.users.updateStatus(input));
    },
  };
}

export type ApiUsersAdapter = ReturnType<typeof createApiUsersAdapter>;

export const apiUsersAdapter = createApiUsersAdapter();
