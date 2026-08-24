export const roles = ["user", "admin", "owner"] as const;
export type Role = (typeof roles)[number];

export const permissions = [
  "admin.users.read",
  "admin.users.write",
  "admin.audit.read",
  "admin.settings.mail.read",
  "admin.settings.mail.write",
  "admin.settings.mail.secret.write",
  "admin.settings.mail.test",
  "admin.settings.auth.read",
  "admin.settings.auth.write",
] as const;
export type Permission = (typeof permissions)[number];

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface Session {
  user: SessionUser;
  expiresAt: Date;
}

const grants: Record<Role, ReadonlySet<Permission>> = {
  user: new Set(),
  admin: new Set([
    "admin.users.read",
    "admin.users.write",
    "admin.audit.read",
    "admin.settings.mail.read",
    "admin.settings.mail.write",
    "admin.settings.mail.secret.write",
    "admin.settings.mail.test",
    "admin.settings.auth.read",
  ]),
  owner: new Set([
    "admin.users.read",
    "admin.users.write",
    "admin.audit.read",
    "admin.settings.mail.read",
    "admin.settings.mail.write",
    "admin.settings.mail.secret.write",
    "admin.settings.mail.test",
    "admin.settings.auth.read",
    "admin.settings.auth.write",
  ]),
};

export function hasPermission(session: Session | null, permission: Permission): boolean {
  return session !== null && grants[session.user.role].has(permission);
}
