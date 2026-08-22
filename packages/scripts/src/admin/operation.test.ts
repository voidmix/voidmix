import type { User, UserRepository } from "@voidmix/domain";
import { describe, expect, it, vi } from "vite-plus/test";

import { getDatabaseScriptsEnv } from "../env.js";
import { resolveAdminCreateInput, runCreateAdmin } from "./operation.js";

const databaseUrl = "postgres://voidmix:voidmix@localhost:5432/voidmix";

function environment() {
  return getDatabaseScriptsEnv({
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    ADMIN_EMAIL: "configured@example.com",
    ADMIN_DISPLAY_NAME: "Configured Admin",
  });
}

function repository(): UserRepository {
  return {
    list: vi.fn(async () => ({ items: [], total: 0, nextCursor: null })),
    getById: vi.fn(async () => null),
    getByEmail: vi.fn(async () => null),
    countActiveAdministrators: vi.fn(async () => 1),
    save: vi.fn(async () => undefined),
    updateStatus: vi.fn(async () => {
      throw new Error("not used");
    }),
    appendAudit: vi.fn(async () => undefined),
    listAudit: vi.fn(async () => []),
  };
}

describe("admin create", () => {
  it("prefers flags before configured and seed defaults", () => {
    const env = environment();

    expect(resolveAdminCreateInput({ email: "flag@example.com", name: undefined }, env)).toEqual({
      email: "flag@example.com",
      displayName: "Configured Admin",
    });
  });

  it("normalizes email and closes the connection", async () => {
    const close = vi.fn(async () => undefined);
    const ensureAdmin = vi.fn(async (): Promise<User> => ({
      id: "admin-id",
      email: "admin@example.com",
      displayName: "Admin",
      role: "admin",
      status: "active",
      createdAt: new Date(),
    }));

    await runCreateAdmin({ email: "ADMIN@EXAMPLE.COM", displayName: "Admin" }, environment(), {
      createAdministration: () => ({ ensureAdmin }),
      log: vi.fn(),
      openUsers: () => ({ close, users: repository() }),
    });

    expect(ensureAdmin).toHaveBeenCalledWith({
      email: "admin@example.com",
      displayName: "Admin",
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("closes the connection after administration failures", async () => {
    const close = vi.fn(async () => undefined);

    await expect(
      runCreateAdmin({ email: "admin@example.com", displayName: "Admin" }, environment(), {
        createAdministration: () => ({
          ensureAdmin: vi.fn(async () => {
            throw new Error("create failed");
          }),
        }),
        log: vi.fn(),
        openUsers: () => ({ close, users: repository() }),
      }),
    ).rejects.toThrow("create failed");
    expect(close).toHaveBeenCalledOnce();
  });
});
