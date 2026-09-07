import { describe, expect, it } from "vite-plus/test";

import { createWorkspaceAccessAdministration, type WorkspaceMembership } from "./index.js";

const membership: WorkspaceMembership = {
  id: "membership-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  role: "editor",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("workspace access administration", () => {
  it("allows active members to read and editors to write", async () => {
    const access = createWorkspaceAccessAdministration({
      memberships: {
        getByUserAndWorkspace: async () => membership,
      },
    });

    await expect(
      access.assertRead({ actorId: "user-1", workspaceId: "workspace-1" }),
    ).resolves.toEqual(membership);
    await expect(
      access.assertWrite({ actorId: "user-1", workspaceId: "workspace-1" }),
    ).resolves.toEqual(membership);
  });

  it("denies missing, suspended, and viewer write access", async () => {
    const access = createWorkspaceAccessAdministration({
      memberships: {
        getByUserAndWorkspace: async ({ userId }) =>
          userId === "viewer"
            ? { ...membership, userId, role: "viewer" }
            : userId === "suspended"
              ? { ...membership, userId, status: "suspended" }
              : null,
      },
    });

    await expect(
      access.assertRead({ actorId: "missing", workspaceId: "workspace-1" }),
    ).rejects.toThrow("Workspace access denied.");
    await expect(
      access.assertRead({ actorId: "suspended", workspaceId: "workspace-1" }),
    ).rejects.toThrow("Workspace access denied.");
    await expect(
      access.assertWrite({ actorId: "viewer", workspaceId: "workspace-1" }),
    ).rejects.toThrow("Workspace access denied.");
  });
});
