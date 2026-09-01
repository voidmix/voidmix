import type { AdminUser, AdminUsersClient, UserListInput } from "./types";

export const seedUsers: readonly AdminUser[] = [
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

function matchesInput(user: AdminUser, input: UserListInput) {
  const query = input.query?.trim().toLowerCase();
  const matchesQuery =
    !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  return (
    matchesQuery &&
    (!input.status || user.status === input.status) &&
    (!input.role || user.role === input.role)
  );
}

export function createPreviewUsersAdapter(
  initialUsers: readonly AdminUser[] = seedUsers,
): AdminUsersClient {
  const users = initialUsers.map((user) => ({ ...user }));

  return {
    async listUsers(input) {
      return users.filter((user) => matchesInput(user, input));
    },
    async updateUserStatus(input) {
      const user = users.find((candidate) => candidate.id === input.userId);
      if (!user) throw new Error("User not found");
      user.status = input.status;
      return { ...user };
    },
  };
}

export type PreviewUsersAdapter = ReturnType<typeof createPreviewUsersAdapter>;
