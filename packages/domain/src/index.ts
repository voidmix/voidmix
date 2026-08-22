import type { Role } from "@voidmix/auth";

export const userStatuses = ["active", "suspended"] as const;
export type UserStatus = (typeof userStatuses)[number];

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: "user.status.changed" | "admin.created";
  targetId: string;
  occurredAt: Date;
  metadata: Record<string, string>;
}

export interface UserPage {
  items: User[];
  total: number;
  nextCursor: string | null;
}

export interface UserListQuery {
  query?: string;
  limit: number;
  cursor?: string;
}

export interface UserRepository {
  list(query: UserListQuery): Promise<UserPage>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  countActiveAdministrators(): Promise<number>;
  save(user: User): Promise<void>;
  updateStatus(id: string, status: UserStatus): Promise<User>;
  appendAudit(event: AuditEvent): Promise<void>;
  listAudit(limit: number): Promise<AuditEvent[]>;
}

export class DomainError extends Error {
  constructor(
    public readonly code:
      | "USER_NOT_FOUND"
      | "SELF_SUSPENSION"
      | "LAST_ADMIN"
      | "EMAIL_ALREADY_EXISTS",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

interface AdministrationDependencies {
  users: UserRepository;
  now?: () => Date;
  id?: () => string;
}

export function createUserAdministration({
  users,
  now = () => new Date(),
  id = () => `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
}: AdministrationDependencies) {
  return {
    list: (query: UserListQuery) => users.list(query),
    get: (userId: string) => users.getById(userId),
    audit: (limit: number) => users.listAudit(limit),
    async updateStatus(input: {
      actorId: string;
      userId: string;
      status: UserStatus;
    }): Promise<User> {
      const target = await users.getById(input.userId);
      if (!target) {
        throw new DomainError("USER_NOT_FOUND", "The requested user does not exist.");
      }

      if (input.actorId === target.id && input.status === "suspended") {
        throw new DomainError("SELF_SUSPENSION", "Administrators cannot suspend themselves.");
      }

      if (
        input.status === "suspended" &&
        target.status === "active" &&
        (target.role === "admin" || target.role === "owner") &&
        (await users.countActiveAdministrators()) <= 1
      ) {
        throw new DomainError("LAST_ADMIN", "The final active administrator cannot be suspended.");
      }

      if (target.status === input.status) {
        return target;
      }

      const updated = await users.updateStatus(target.id, input.status);
      await users.appendAudit({
        id: id(),
        actorId: input.actorId,
        action: "user.status.changed",
        targetId: target.id,
        occurredAt: now(),
        metadata: { from: target.status, to: input.status },
      });

      return updated;
    },
    async ensureAdmin(input: { email: string; displayName: string }): Promise<User> {
      const existing = await users.getByEmail(input.email);
      if (existing) {
        return existing;
      }

      const admin: User = {
        id: id(),
        email: input.email,
        displayName: input.displayName,
        role: "admin",
        status: "active",
        createdAt: now(),
      };
      await users.save(admin);
      await users.appendAudit({
        id: id(),
        actorId: admin.id,
        action: "admin.created",
        targetId: admin.id,
        occurredAt: now(),
        metadata: { email: admin.email },
      });
      return admin;
    },
  };
}
