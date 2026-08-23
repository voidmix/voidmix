import { describe, expect, it, vi } from "vite-plus/test";

import { createFallbackUsersAdapter } from "./fallback-adapter";
import type { AdminUser, AdminUsersClient } from "./types";

function makeClient(overrides: Partial<AdminUsersClient>): AdminUsersClient {
  return {
    listUsers: vi.fn(async () => []),
    updateUserStatus: vi.fn(async () => {
      throw new Error("not implemented");
    }),
    ...overrides,
  };
}

describe("fallback users adapter", () => {
  it("logs and delegates list calls to preview after an API failure", async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    const preview = makeClient({
      listUsers: vi.fn(async (): Promise<readonly AdminUser[]> => [
        {
          id: "preview-user",
          name: "Preview User",
          email: "preview@example.com",
          role: "user",
          status: "active",
          lastActive: "now",
          joinedAt: "Jan 01, 2026",
        },
      ]),
    });
    const api = makeClient({ listUsers: vi.fn(async () => Promise.reject(new Error("offline"))) });
    const adapter = createFallbackUsersAdapter({ api, logger, preview });

    await expect(adapter.listUsers({ query: "preview" })).resolves.toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith({
      event: "admin.users.list.fallback",
      reason: "api_unavailable",
    });
  });

  it("preserves the not-found event when preview update cannot find a user", async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    const api = makeClient({
      updateUserStatus: vi.fn(async () => Promise.reject(new Error("offline"))),
    });
    const preview = makeClient({
      updateUserStatus: vi.fn(async () => {
        throw new Error("User not found");
      }),
    });
    const adapter = createFallbackUsersAdapter({ api, logger, preview });

    await expect(
      adapter.updateUserStatus({ userId: "missing", status: "suspended" }),
    ).rejects.toThrow("User not found");
    expect(logger.error).toHaveBeenCalledWith({
      event: "admin.users.update.failed",
      reason: "user_not_found",
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
