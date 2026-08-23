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
  updateUserStatus(input: { userId: string; status: UserStatus }): Promise<AdminUser>;
}
