import type { User, UserRepository } from "@voidmix/domain";
import { describe, expect, it, vi } from "vite-plus/test";

import { getDatabaseScriptsEnv } from "../env.js";
import { runMigrate, runSeed, runStudio } from "./operation.js";

const databaseUrl = "postgres://voidmix:voidmix@localhost:5432/voidmix";

function environment(overrides: Record<string, string> = {}) {
  return getDatabaseScriptsEnv({
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    ...overrides,
  });
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: "user-id",
    email: "owner@voidmix.local",
    displayName: "Owner",
    role: "admin",
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function userRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    list: vi.fn(async () => ({ items: [], total: 0, nextCursor: null })),
    getById: vi.fn(async () => null),
    getByEmail: vi.fn(async () => null),
    countActiveAdministrators: vi.fn(async () => 1),
    save: vi.fn(async () => undefined),
    updateStatus: vi.fn(async () => user()),
    appendAudit: vi.fn(async () => undefined),
    listAudit: vi.fn(async () => []),
    ...overrides,
  };
}

describe("database commands", () => {
  it("requires DATABASE_URL before migrations can be configured", () => {
    vi.stubEnv("DATABASE_URL", undefined);

    expect(() => getDatabaseScriptsEnv({ NODE_ENV: "test" })).toThrow(
      "DATABASE_URL: Invalid input: expected string, received undefined",
    );

    vi.unstubAllEnvs();
  });

  it("migrates the configured database", async () => {
    const migrate = vi.fn(async () => undefined);

    await runMigrate(environment(), { migrate, log: vi.fn() });

    expect(migrate).toHaveBeenCalledWith(databaseUrl);
  });

  it("seeds users and always closes the connection", async () => {
    const save = vi.fn(async () => undefined);
    const users = userRepository({ save });
    const close = vi.fn(async () => undefined);
    const ensureAdmin = vi.fn(async () => user({ id: "admin-id" }));

    await runSeed(environment(), {
      createAdministration: () => ({ ensureAdmin }),
      log: vi.fn(),
      now: () => new Date("2026-02-01T00:00:00.000Z"),
      openUsers: () => ({ users, close }),
      randomUUID: () => "local-user-id",
    });

    expect(ensureAdmin).toHaveBeenCalledWith({
      email: "owner@voidmix.local",
      displayName: "Local Owner",
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ id: "local-user-id", email: "user@voidmix.local" }),
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("closes the seed connection after failures", async () => {
    const close = vi.fn(async () => undefined);

    await expect(
      runSeed(environment(), {
        createAdministration: () => ({
          ensureAdmin: vi.fn(async () => {
            throw new Error("seed failed");
          }),
        }),
        log: vi.fn(),
        now: () => new Date(),
        openUsers: () => ({ users: userRepository(), close }),
        randomUUID: () => "id",
      }),
    ).rejects.toThrow("seed failed");
    expect(close).toHaveBeenCalledOnce();
  });

  it("restricts seed and studio to development or test", async () => {
    const production = environment({ NODE_ENV: "production" });
    const runCommand = vi.fn(async () => undefined);

    await expect(
      runSeed(production, {
        createAdministration: () => ({ ensureAdmin: vi.fn() }),
        log: vi.fn(),
        now: () => new Date(),
        openUsers: vi.fn(),
        randomUUID: () => "id",
      }),
    ).rejects.toThrow("db seed is restricted");
    await expect(
      runStudio(production, {
        log: vi.fn(),
        processEnv: {},
        repositoryRoot: "/repo",
        runCommand,
      }),
    ).rejects.toThrow("db studio is restricted");
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("starts Drizzle Studio with the loaded environment", async () => {
    const runCommand = vi.fn(async () => undefined);
    const processEnv = { DATABASE_URL: databaseUrl };

    await runStudio(environment(), {
      log: vi.fn(),
      processEnv,
      repositoryRoot: "/repo",
      runCommand,
    });

    expect(runCommand).toHaveBeenCalledWith(
      ["bun", "run", "drizzle-kit", "studio", "--config", "drizzle.config.ts"],
      { cwd: "/repo/packages/db", env: processEnv },
    );
  });
});
