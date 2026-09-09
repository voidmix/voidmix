export type UserRole = "owner" | "admin" | "user";
export type UserStatus = "active" | "suspended";
export type AdminUsersError = "directoryLoadFailed";

export type AdminLastActive =
  | { kind: "connected" }
  | { kind: "relative"; value: number; unit: "second" | "minute" | "hour" | "day" };

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive: AdminLastActive;
  joinedAt: Date | null;
}

export interface UserListInput {
  query?: string;
  status?: UserStatus;
  role?: UserRole;
}

export interface AdminUsersClient {
  listUsers(input: UserListInput): Promise<readonly AdminUser[]>;
  updateUserStatus(input: { userId: string; status: UserStatus }): Promise<AdminUser>;
}
