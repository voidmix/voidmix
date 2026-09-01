import { describe, expect, it } from "vite-plus/test";

import { createPreviewUsersAdapter } from "./preview-adapter";

describe("preview users adapter", () => {
  it("filters by trimmed name/email query, status, and role", async () => {
    const adapter = createPreviewUsersAdapter([
      {
        id: "1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "user",
        status: "active",
        lastActive: "now",
        joinedAt: "Jan 01, 2026",
      },
      {
        id: "2",
        name: "Grace Hopper",
        email: "grace@example.com",
        role: "admin",
        status: "suspended",
        lastActive: "yesterday",
        joinedAt: "Jan 02, 2026",
      },
    ]);

    await expect(
      adapter.listUsers({ query: "  ADA@EXAMPLE  ", status: "active" }),
    ).resolves.toEqual([expect.objectContaining({ id: "1" })]);
    await expect(adapter.listUsers({ status: "active" })).resolves.toHaveLength(1);
    await expect(adapter.listUsers({ role: "admin" })).resolves.toEqual([
      expect.objectContaining({ id: "2" }),
    ]);
  });

  it("updates a copied preview record without mutating the fixture", async () => {
    const adapter = createPreviewUsersAdapter([
      {
        id: "1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "user",
        status: "active",
        lastActive: "now",
        joinedAt: "Jan 01, 2026",
      },
    ]);

    await expect(
      adapter.updateUserStatus({ userId: "1", status: "suspended" }),
    ).resolves.toMatchObject({
      status: "suspended",
    });
    await expect(adapter.listUsers({ status: "suspended" })).resolves.toHaveLength(1);
    await expect(adapter.updateUserStatus({ userId: "missing", status: "active" })).rejects.toThrow(
      "User not found",
    );
  });
});
