import { describe, expect, it } from "vite-plus/test";
import { createProjectApplication, type ProjectV2Repository } from "./index.js";
import type { ProjectMemberV2, ProjectV2 } from "@voidmix/core";
import type { TaskV2 } from "@voidmix/core";

const project = (overrides: Partial<ProjectV2> = {}): ProjectV2 => ({
  id: "project-1",
  createdByUserId: "user-1",
  personalOwnerId: "user-1",
  organizationId: null,
  title: "One project",
  description: null,
  stage: "draft",
  archived: false,
  deadline: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

const task = (overrides: Partial<TaskV2> = {}): TaskV2 => ({
  id: "task-1",
  projectId: "project-1",
  createdByUserId: "user-1",
  title: "First task",
  status: "todo",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

const emptyProjectMembers = () => ({
  getByProjectAndUser: async () => null,
  listByProject: async () => [],
  upsert: async () => {
    throw new Error("unused");
  },
  remove: async () => null,
});

const projectLifecycle = {
  update: async () => project(),
  setArchived: async () => project(),
  delete: async () => true,
};

const emptyReviews = () => ({
  getById: async () => null,
  listByProject: async () => [],
  create: async () => {
    throw new Error("unused");
  },
  update: async () => null,
});

const emptyFeedback = () => ({
  listByReview: async () => [],
  create: async () => {
    throw new Error("unused");
  },
});

const emptyAssets = () => ({
  getById: async () => null,
  listByProject: async () => [],
  create: async () => {
    throw new Error("unused");
  },
});

const emptyAssetVersions = () => ({
  listByAsset: async () => [],
  create: async () => {
    throw new Error("unused");
  },
});

const emptyBlobStorage = () => ({
  createUpload: async () => {
    throw new Error("unused");
  },
  completeUpload: async () => {
    throw new Error("unused");
  },
  getDownload: async () => null,
  delete: async () => undefined,
});

describe("V2 project application", () => {
  it("lists more than one personal project for an account", async () => {
    const projects = [project(), project({ id: "project-2", title: "Two projects" })];
    const repository: ProjectV2Repository = {
      getById: async (id) => projects.find((value) => value.id === id) ?? null,
      listByPersonalOwner: async () => projects,
      listByOrganization: async () => [],
      create: async (input) =>
        project({
          id: input.id,
          createdByUserId: input.createdByUserId,
          personalOwnerId: "user-1",
          title: input.title,
          createdAt: input.now,
          updatedAt: input.now,
        }),
      ...projectLifecycle,
    };
    const app = createProjectApplication({
      projects: repository,
      tasks: {
        getById: async () => null,
        listByProject: async () => [],
        create: async () => project() as never,
        update: async () => null,
      },
      projectMembers: emptyProjectMembers(),
      organizationMembers: {
        getByOrganizationAndUser: async () => null,
        listByUser: async () => [],
      },
      reviews: emptyReviews(),
      feedback: emptyFeedback(),
      assets: emptyAssets(),
      assetVersions: emptyAssetVersions(),
      blobStorage: emptyBlobStorage(),
    });
    await expect(app.listForUser("user-1")).resolves.toHaveLength(2);
  });

  it("allows a personal project collaborator through its project grant", async () => {
    const repository: ProjectV2Repository = {
      getById: async () => project(),
      listByPersonalOwner: async () => [],
      listByOrganization: async () => [],
      create: async () => project(),
      ...projectLifecycle,
    };
    const member: ProjectMemberV2 = {
      projectId: "project-1",
      userId: "user-2",
      role: "commenter",
      status: "active",
    };
    const app = createProjectApplication({
      projects: repository,
      tasks: {
        getById: async () => null,
        listByProject: async () => [],
        create: async () => project() as never,
        update: async () => null,
      },
      projectMembers: {
        ...emptyProjectMembers(),
        getByProjectAndUser: async () => member,
      },
      organizationMembers: {
        getByOrganizationAndUser: async () => null,
        listByUser: async () => [],
      },
      reviews: emptyReviews(),
      feedback: emptyFeedback(),
      assets: emptyAssets(),
      assetVersions: emptyAssetVersions(),
      blobStorage: emptyBlobStorage(),
    });
    await expect(app.get({ actorId: "user-2", projectId: "project-1" })).resolves.toMatchObject({
      access: "comment",
    });
  });

  it("includes projects from active organization memberships", async () => {
    const personal = project();
    const organization = project({
      id: "project-org-1",
      personalOwnerId: null,
      organizationId: "org-1",
      title: "Organization project",
    });
    const repository: ProjectV2Repository = {
      getById: async () => null,
      listByPersonalOwner: async () => [personal],
      listByOrganization: async (organizationId) =>
        organizationId === "org-1" ? [organization] : [],
      create: async () => organization,
      ...projectLifecycle,
    };
    const app = createProjectApplication({
      projects: repository,
      tasks: {
        getById: async () => null,
        listByProject: async () => [],
        create: async () => organization as never,
        update: async () => null,
      },
      projectMembers: emptyProjectMembers(),
      organizationMembers: {
        getByOrganizationAndUser: async () => null,
        listByUser: async () => [
          { organizationId: "org-1", userId: "user-1", role: "editor", status: "active" },
        ],
      },
      reviews: emptyReviews(),
      feedback: emptyFeedback(),
      assets: emptyAssets(),
      assetVersions: emptyAssetVersions(),
      blobStorage: emptyBlobStorage(),
    });
    await expect(app.listForUser("user-1")).resolves.toEqual([organization, personal]);
  });

  it("requires project write access to create and update tasks", async () => {
    let current = task();
    const repository: ProjectV2Repository = {
      getById: async () => project(),
      listByPersonalOwner: async () => [],
      listByOrganization: async () => [],
      create: async () => project(),
      ...projectLifecycle,
    };
    const app = createProjectApplication({
      projects: repository,
      tasks: {
        getById: async () => current,
        listByProject: async () => [current],
        create: async (input) =>
          (current = task({
            id: input.id,
            title: input.title,
            createdAt: input.now,
            updatedAt: input.now,
          })),
        update: async (input) => (current = task({ ...current, ...input, updatedAt: input.now })),
      },
      projectMembers: emptyProjectMembers(),
      organizationMembers: {
        getByOrganizationAndUser: async () => null,
        listByUser: async () => [],
      },
      reviews: emptyReviews(),
      feedback: emptyFeedback(),
      assets: emptyAssets(),
      assetVersions: emptyAssetVersions(),
      blobStorage: emptyBlobStorage(),
    });
    await expect(
      app.createTask({ actorId: "user-1", projectId: "project-1", title: "Ship V2" }),
    ).resolves.toMatchObject({ title: "Ship V2" });
    await expect(
      app.updateTask({ actorId: "user-1", taskId: current.id, status: "done" }),
    ).resolves.toMatchObject({ status: "done" });
    await expect(
      app.createTask({ actorId: "user-2", projectId: "project-1", title: "Denied" }),
    ).rejects.toMatchObject({ code: "PROJECT_ACCESS_DENIED" });
  });

  it("manages project members through the project owner capability", async () => {
    let members: ProjectMemberV2[] = [];
    const repository: ProjectV2Repository = {
      getById: async () => project(),
      listByPersonalOwner: async () => [],
      listByOrganization: async () => [],
      create: async () => project(),
      ...projectLifecycle,
    };
    const app = createProjectApplication({
      projects: repository,
      tasks: {
        getById: async () => null,
        listByProject: async () => [],
        create: async () => task(),
        update: async () => null,
      },
      projectMembers: {
        getByProjectAndUser: async ({ userId }) =>
          members.find((member) => member.userId === userId) ?? null,
        listByProject: async () => members,
        upsert: async (input) => {
          const value: ProjectMemberV2 = {
            projectId: input.projectId,
            userId: input.userId,
            role: input.role,
            status: "active",
          };
          members = [...members.filter((member) => member.userId !== input.userId), value];
          return value;
        },
        remove: async ({ userId }) => {
          const member = members.find((value) => value.userId === userId);
          if (!member) return null;
          const removed = { ...member, status: "removed" as const };
          members = members.map((value) => (value.userId === userId ? removed : value));
          return removed;
        },
      },
      organizationMembers: {
        getByOrganizationAndUser: async () => null,
        listByUser: async () => [],
      },
      reviews: emptyReviews(),
      feedback: emptyFeedback(),
      assets: emptyAssets(),
      assetVersions: emptyAssetVersions(),
      blobStorage: emptyBlobStorage(),
    });

    await expect(
      app.addMember({
        actorId: "user-1",
        projectId: "project-1",
        userId: "user-2",
        role: "viewer",
      }),
    ).resolves.toMatchObject({ userId: "user-2", role: "viewer", status: "active" });
    await expect(
      app.listMembers({ actorId: "user-1", projectId: "project-1" }),
    ).resolves.toHaveLength(1);
    await expect(
      app.updateMember({
        actorId: "user-1",
        projectId: "project-1",
        userId: "user-2",
        role: "editor",
      }),
    ).resolves.toMatchObject({ role: "editor" });
    await expect(
      app.removeMember({ actorId: "user-1", projectId: "project-1", userId: "user-2" }),
    ).resolves.toMatchObject({ status: "removed" });
    await expect(
      app.addMember({
        actorId: "user-2",
        projectId: "project-1",
        userId: "user-3",
        role: "viewer",
      }),
    ).rejects.toMatchObject({ code: "PROJECT_ACCESS_DENIED" });
  });

  it("applies write and manage capabilities to project lifecycle changes", async () => {
    let current = project();
    const repository: ProjectV2Repository = {
      getById: async () => current,
      listByPersonalOwner: async () => [],
      listByOrganization: async () => [],
      create: async () => current,
      update: async (input) => {
        current = project({ ...current, ...input, updatedAt: input.now });
        return current;
      },
      setArchived: async (input) => {
        current = project({ ...current, archived: input.archived, updatedAt: input.now });
        return current;
      },
      delete: async () => true,
    };
    const app = createProjectApplication({
      projects: repository,
      tasks: {
        getById: async () => null,
        listByProject: async () => [],
        create: async () => task(),
        update: async () => null,
      },
      projectMembers: emptyProjectMembers(),
      organizationMembers: {
        getByOrganizationAndUser: async () => null,
        listByUser: async () => [],
      },
      reviews: emptyReviews(),
      feedback: emptyFeedback(),
      assets: emptyAssets(),
      assetVersions: emptyAssetVersions(),
      blobStorage: emptyBlobStorage(),
    });
    await expect(
      app.updateProject({ actorId: "user-1", projectId: "project-1", title: "Renamed" }),
    ).resolves.toMatchObject({ title: "Renamed" });
    await expect(
      app.archiveProject({ actorId: "user-1", projectId: "project-1" }),
    ).resolves.toMatchObject({
      archived: true,
    });
    await expect(
      app.restoreProject({ actorId: "user-2", projectId: "project-1" }),
    ).rejects.toMatchObject({
      code: "PROJECT_ACCESS_DENIED",
    });
  });
});
