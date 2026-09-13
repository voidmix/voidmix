import {
  InMemoryProjectRepository,
  createInMemoryAssetRepositories,
  createInMemoryProjectStudioRepositories,
  InMemoryUserRepository,
  InMemoryWorkspaceMembershipRepository,
} from "@voidmix/db";
import type { Asset, AssetVersion, Project, User } from "@voidmix/core";
import { describe, expect, it } from "vite-plus/test";

import { createProjectStudioService } from "./project-studio.js";

const owner: User = {
  id: "owner-1",
  email: "owner@example.com",
  displayName: "Owner",
  role: "owner",
  status: "active",
  createdAt: new Date("2026-09-01T00:00:00Z"),
};
const collaborator: User = {
  id: "collaborator-1",
  email: "collaborator@example.com",
  displayName: "Collaborator",
  role: "user",
  status: "active",
  createdAt: new Date("2026-09-01T00:00:00Z"),
};
const outsider: User = {
  id: "outside-workspace",
  email: "outside@example.com",
  displayName: "Outside",
  role: "user",
  status: "active",
  createdAt: new Date("2026-09-01T00:00:00Z"),
};

const seed: Project = {
  id: "project-1",
  name: "Launch film",
  description: "A film",
  status: "active",
  ownerId: owner.id,
  workspaceId: "workspace-1",
  stage: "review",
  archived: false,
  archivedAt: null,
  previousStage: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

function service(options: { withMemberships?: boolean } = {}) {
  return createProjectStudioService({
    projects: new InMemoryProjectRepository([seed]),
    users: new InMemoryUserRepository([owner]),
    ...(options.withMemberships
      ? {
          memberships: new InMemoryWorkspaceMembershipRepository([
            {
              id: "membership-1",
              workspaceId: "workspace-1",
              userId: owner.id,
              role: "owner",
              status: "active",
              createdAt: seed.createdAt,
              updatedAt: seed.updatedAt,
            },
          ]),
        }
      : {}),
    id: () => "generated-id",
    now: () => new Date("2026-09-09T00:00:00Z"),
  });
}

describe("Project Studio service", () => {
  it("projects canonical summaries and task progress", async () => {
    const studio = service();
    const task = await studio.createProjectTask({
      actorId: owner.id,
      projectId: seed.id,
      title: "Approve cut",
      idempotencyKey: "task-1",
    });
    await studio.updateProjectTask({ actorId: owner.id, taskId: task.id, status: "done" });

    const result = await studio.getProject({ actorId: owner.id, projectId: seed.id });
    expect(result).toMatchObject({
      id: seed.id,
      workspaceId: "workspace-1",
      stage: "review",
      progress: 1,
      tasks: [{ id: task.id, status: "done" }],
    });
  });

  it("does not expose another account's project", async () => {
    const studio = service();

    await expect(
      studio.getProject({ actorId: "another-user", projectId: seed.id }),
    ).resolves.toBeNull();
    await expect(studio.listProjects({ actorId: "another-user", limit: 20 })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it("aggregates projects from every active Workspace membership", async () => {
    const shared = {
      ...seed,
      id: "project-2",
      ownerId: "another-user",
      workspaceId: "workspace-2",
    };
    const studio = createProjectStudioService({
      projects: new InMemoryProjectRepository([seed, shared]),
      users: new InMemoryUserRepository([owner]),
      memberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-1",
          workspaceId: "workspace-1",
          userId: owner.id,
          role: "owner",
          status: "active",
          createdAt: seed.createdAt,
          updatedAt: seed.updatedAt,
        },
        {
          id: "membership-2",
          workspaceId: "workspace-2",
          userId: owner.id,
          role: "viewer",
          status: "active",
          createdAt: seed.createdAt,
          updatedAt: seed.updatedAt,
        },
      ]),
    });

    await expect(studio.listProjects({ actorId: owner.id, limit: 20 })).resolves.toMatchObject({
      items: [{ id: "project-2" }, { id: "project-1" }],
    });
    await expect(studio.getSnapshot({ actorId: owner.id })).resolves.toMatchObject({
      account: { workspaceIds: ["workspace-1", "workspace-2"] },
    });
  });

  it("does not expose an owned project through an inactive Workspace membership", async () => {
    const projectRepository = new InMemoryProjectRepository([seed]);
    const studio = createProjectStudioService({
      projects: projectRepository,
      users: new InMemoryUserRepository([owner]),
      memberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-1",
          workspaceId: seed.workspaceId!,
          userId: owner.id,
          role: "owner",
          status: "suspended",
          createdAt: seed.createdAt,
          updatedAt: seed.updatedAt,
        },
      ]),
    });

    await expect(studio.getProject({ actorId: owner.id, projectId: seed.id })).resolves.toBeNull();
  });

  it("projects Review, Feedback, and Activity repositories through the account boundary", async () => {
    const repositories = createInMemoryProjectStudioRepositories({
      id: (() => {
        let sequence = 0;
        return () => `studio-${++sequence}`;
      })(),
      now: () => new Date("2026-09-09T00:00:00Z"),
    });
    const studio = createProjectStudioService({
      projects: new InMemoryProjectRepository([seed]),
      users: new InMemoryUserRepository([owner]),
      memberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-1",
          workspaceId: seed.workspaceId!,
          userId: owner.id,
          role: "owner",
          status: "active",
          createdAt: seed.createdAt,
          updatedAt: seed.updatedAt,
        },
      ]),
      repositories,
      id: () => "project-id",
      now: () => new Date("2026-09-09T00:00:00Z"),
    });

    const created = await studio.createReview({
      actorId: owner.id,
      projectId: seed.id,
      targetVersionId: null,
      title: "First pass",
      idempotencyKey: "review-1",
    });
    await studio.updateReview({ actorId: owner.id, reviewId: created.id, status: "open" });
    const feedback = await studio.createFeedback({
      actorId: owner.id,
      reviewId: created.id,
      targetVersionId: "version-1",
      body: "Tighten the opening.",
      idempotencyKey: "feedback-1",
    });
    await studio.updateFeedback({ actorId: owner.id, feedbackId: feedback.id, status: "resolved" });
    await repositories.activity.create({
      type: "review.created",
      accountId: owner.id,
      workspaceId: seed.workspaceId!,
      projectId: seed.id,
      actorId: owner.id,
      targetId: created.id,
      summary: "Review created",
    });

    await expect(
      studio.listReviews({ actorId: owner.id, projectId: seed.id, limit: 20 }),
    ).resolves.toMatchObject({
      items: [{ id: created.id, status: "open" }],
    });
    await expect(
      studio.listFeedback({ actorId: owner.id, reviewId: created.id, limit: 20 }),
    ).resolves.toMatchObject({
      items: [{ id: feedback.id, status: "resolved" }],
    });
    const activityPage = await studio.listActivity({
      actorId: owner.id,
      projectId: seed.id,
      limit: 20,
    });
    expect(activityPage.items.some((item) => item.type === "review.created")).toBe(true);
  });

  it("projects authorized asset references and Library versions", async () => {
    const timestamp = new Date("2026-09-09T00:00:00Z");
    const assets = createInMemoryAssetRepositories();
    const asset: Asset = {
      id: "asset-1",
      workspaceId: seed.workspaceId!,
      path: "images/cover.png",
      status: "active",
      headVersionId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await assets.assets.createIfPathAvailable(asset);
    const version: AssetVersion = {
      id: "version-1",
      assetId: asset.id,
      workspaceId: asset.workspaceId,
      blobHash: "0123456789abcdef",
      byteSize: 128,
      contentType: "image/png",
      parentVersionId: null,
      createdBy: owner.id,
      createdAt: timestamp,
      idempotencyKey: "version-1",
    };
    await assets.commitVersion({ version, expectedHeadVersionId: null });
    const secondAsset: Asset = {
      ...asset,
      id: "asset-2",
      path: "images/logo.png",
    };
    await assets.assets.createIfPathAvailable(secondAsset);
    const secondVersion: AssetVersion = {
      ...version,
      id: "version-2",
      assetId: secondAsset.id,
    };
    await assets.commitVersion({ version: secondVersion, expectedHeadVersionId: null });
    const repositories = createInMemoryProjectStudioRepositories({
      assetReferences: [
        {
          id: "reference-1",
          projectId: seed.id,
          assetId: asset.id,
          versionId: version.id,
          workspaceId: asset.workspaceId,
          label: "Cover",
          createdAt: timestamp,
        },
      ],
    });
    const studio = createProjectStudioService({
      projects: new InMemoryProjectRepository([seed]),
      users: new InMemoryUserRepository([owner]),
      memberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-1",
          workspaceId: seed.workspaceId!,
          userId: owner.id,
          role: "owner",
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]),
      repositories,
      assets,
    });

    await expect(
      studio.listProjectAssets({ actorId: owner.id, projectId: seed.id, limit: 20 }),
    ).resolves.toMatchObject({ items: [{ id: "reference-1", assetId: asset.id }] });
    await expect(
      studio.createProjectAsset({
        actorId: owner.id,
        projectId: seed.id,
        assetId: "asset-2",
        versionId: secondVersion.id,
        label: "Current cover",
      }),
    ).resolves.toMatchObject({
      assetId: secondAsset.id,
      versionId: secondVersion.id,
      label: "Current cover",
    });
    const foreignAsset: Asset = {
      ...asset,
      id: "asset-foreign",
      workspaceId: "workspace-foreign",
      path: "images/foreign.png",
    };
    await assets.assets.createIfPathAvailable(foreignAsset);
    await expect(
      studio.createProjectAsset({
        actorId: owner.id,
        projectId: seed.id,
        assetId: foreignAsset.id,
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
    await expect(
      studio.searchLibrary({ actorId: owner.id, query: "cover", limit: 20 }),
    ).resolves.toMatchObject({
      assets: [{ id: asset.id, path: asset.path }],
      versions: [{ id: version.id, blobHash: version.blobHash }],
    });
    await expect(
      studio.listAssetVersions({ actorId: owner.id, assetId: asset.id, limit: 20 }),
    ).resolves.toMatchObject({ items: [{ id: version.id, byteSize: 128 }] });
  });

  it("requires project management access and same-Workspace membership for grants", async () => {
    const members = createInMemoryProjectStudioRepositories();
    const memberships = new InMemoryWorkspaceMembershipRepository([
      {
        id: "membership-owner",
        workspaceId: "workspace-1",
        userId: owner.id,
        role: "owner",
        status: "active",
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt,
      },
      {
        id: "membership-collaborator",
        workspaceId: "workspace-1",
        userId: collaborator.id,
        role: "viewer",
        status: "active",
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt,
      },
    ]);
    const studio = createProjectStudioService({
      projects: new InMemoryProjectRepository([seed]),
      users: new InMemoryUserRepository([owner, collaborator, outsider]),
      memberships,
      repositories: members,
    });

    await expect(
      studio.addProjectMember({
        actorId: owner.id,
        projectId: seed.id,
        userId: collaborator.id,
        role: "commenter",
      }),
    ).resolves.toMatchObject({ userId: collaborator.id, role: "commenter", status: "active" });
    await expect(
      studio.updateProjectMember({
        actorId: collaborator.id,
        projectId: seed.id,
        userId: owner.id,
        role: "viewer",
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    await expect(
      studio.addProjectMember({
        actorId: owner.id,
        projectId: seed.id,
        userId: "outside-workspace",
        role: "viewer",
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
  });
});
