import { describe, expect, it } from "vite-plus/test";
import { createUserAdministration, type AuditEvent, type User, type UserRepository } from "./index";

function repository(seed: User[]): UserRepository {
  const users = new Map(seed.map((user) => [user.id, user]));
  const audit: AuditEvent[] = [];
  return {
    async list() {
      return { items: [...users.values()], total: users.size, nextCursor: null };
    },
    async getById(id) {
      return users.get(id) ?? null;
    },
    async getByEmail(email) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async countActiveAdministrators() {
      return [...users.values()].filter(
        (user) => user.status === "active" && (user.role === "admin" || user.role === "owner"),
      ).length;
    },
    async save(user) {
      users.set(user.id, user);
    },
    async updateStatus(id, status) {
      const current = users.get(id);
      if (!current) throw new Error("missing user");
      const updated = { ...current, status };
      users.set(id, updated);
      return updated;
    },
    async appendAudit(event) {
      audit.push(event);
    },
    async listAudit() {
      return audit;
    },
  };
}

const admin: User = {
  id: "usr_admin",
  email: "admin@voidmix.local",
  displayName: "Admin",
  role: "admin",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("user administration", () => {
  it("prevents an administrator from suspending themselves", async () => {
    const service = createUserAdministration({ users: repository([admin]) });
    await expect(
      service.updateStatus({ actorId: admin.id, userId: admin.id, status: "suspended" }),
    ).rejects.toMatchObject({ code: "SELF_SUSPENSION" });
  });

  it("keeps the final active administrator from being suspended", async () => {
    const service = createUserAdministration({ users: repository([admin]) });

    await expect(
      service.updateStatus({ actorId: "operator", userId: admin.id, status: "suspended" }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  it("creates an initial administrator idempotently", async () => {
    const service = createUserAdministration({ users: repository([]), id: () => "usr_created" });
    const first = await service.ensureAdmin({ email: admin.email, displayName: admin.displayName });
    const second = await service.ensureAdmin({
      email: admin.email,
      displayName: admin.displayName,
    });
    expect(second.id).toBe(first.id);
  });
});
