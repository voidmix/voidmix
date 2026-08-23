import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  api: {
    admin: {
      users: {
        list: vi.fn(),
        updateStatus: vi.fn(),
      },
    },
  },
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@voidmix/client", () => ({
  createApiClient: vi.fn(() => mocks.api),
}));

vi.mock("@voidmix/logger/client", () => ({
  log: {
    error: mocks.error,
    warn: mocks.warn,
  },
}));

async function loadClient() {
  vi.resetModules();
  return import("./client");
}

describe("admin users client fallback", () => {
  beforeEach(() => {
    mocks.api.admin.users.list.mockReset();
    mocks.api.admin.users.updateStatus.mockReset();
    mocks.error.mockReset();
    mocks.warn.mockReset();
  });

  it("filters seed users by query and status when the API is unavailable", async () => {
    mocks.api.admin.users.list.mockRejectedValue(new Error("offline"));
    const { adminUsersClient } = await loadClient();

    await expect(
      adminUsersClient.listUsers({ query: "rei", status: "suspended" }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "usr_suspended",
        email: "rei@monoform.jp",
        status: "suspended",
      }),
    ]);
    expect(mocks.warn).toHaveBeenCalledWith({
      event: "admin.users.list.fallback",
      reason: "api_unavailable",
    });
  });

  it("updates seed status in the fallback and reports missing users", async () => {
    mocks.api.admin.users.updateStatus.mockRejectedValue(new Error("offline"));
    const { adminUsersClient } = await loadClient();

    await expect(
      adminUsersClient.updateUserStatus({ userId: "admin-local", status: "suspended" }),
    ).resolves.toMatchObject({ id: "admin-local", status: "suspended" });
    expect(mocks.warn).toHaveBeenCalledWith({
      event: "admin.users.update.fallback",
      reason: "api_unavailable",
    });

    await expect(
      adminUsersClient.updateUserStatus({ userId: "missing", status: "suspended" }),
    ).rejects.toThrow("User not found");
    expect(mocks.error).toHaveBeenCalledWith({
      event: "admin.users.update.failed",
      reason: "user_not_found",
    });
  });
});
