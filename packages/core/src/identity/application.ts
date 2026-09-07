import { DomainError } from "../shared/errors.js";
import { defaultClock, defaultIdGenerator } from "../shared/types.js";
import type { User, UserListQuery, UserRepository, UserStatus } from "./model.js";

interface UserAdministrationDependencies {
  users: UserRepository;
  now?: () => Date;
  id?: () => string;
}

export function createUserAdministration({
  users,
  now = () => defaultClock.now(),
  id = () => defaultIdGenerator.next(),
}: UserAdministrationDependencies) {
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
        targetType: "user",
        targetId: target.id,
        targetUserId: target.id,
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
        targetType: "user",
        targetId: admin.id,
        targetUserId: admin.id,
        occurredAt: now(),
        metadata: { email: admin.email },
      });
      return admin;
    },
  };
}
