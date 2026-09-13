import { describe, expect, it } from "vite-plus/test";

import { createProjectAdministration } from "./application.js";
import type { Project, ProjectRepository } from "./model.js";

const initialProject: Project = {
  id: "project-1",
  name: "Northstar",
  description: "Launch",
  status: "active",
  ownerId: "owner-1",
  stage: "review",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

function repository(project: Project): ProjectRepository & {
  updates: Array<Parameters<ProjectRepository["update"]>[0]>;
} {
  const updates: Array<Parameters<ProjectRepository["update"]>[0]> = [];
  let current = project;
  return {
    updates,
    async list() {
      return [project];
    },
    async getById(id) {
      return id === project.id ? current : null;
    },
    async create() {
      return project;
    },
    async update(input) {
      updates.push(input);
      current = { ...current, ...input };
      return current;
    },
    async listTasks() {
      return [];
    },
    async createTask() {
      throw new Error("unused");
    },
    async updateTask() {
      throw new Error("unused");
    },
  };
}

describe("project administration lifecycle compatibility", () => {
  it("maps a legacy completed update to delivered while retaining the legacy status", async () => {
    const projects = repository(initialProject);
    const service = createProjectAdministration({ projects });

    await service.update({ id: initialProject.id, actorId: "owner-1", status: "completed" });

    expect(projects.updates[0]).toMatchObject({
      status: "completed",
      stage: "delivered",
      archived: false,
      archivedAt: null,
      previousStage: null,
    });
  });

  it("uses the injected clock for legacy archive and restores the prior stage", async () => {
    const projects = repository(initialProject);
    const service = createProjectAdministration({
      projects,
      now: () => new Date("2026-09-03T00:00:00.000Z"),
    });

    await service.update({ id: initialProject.id, actorId: "owner-1", status: "archived" });
    const archived = { ...initialProject, ...projects.updates[0]! } as Project;
    expect(archived).toMatchObject({
      status: "archived",
      stage: "review",
      archived: true,
      archivedAt: new Date("2026-09-03T00:00:00.000Z"),
      previousStage: "review",
    });

    await service.update({ id: archived.id, actorId: "owner-1", archived: false });
    expect(projects.updates[1]).toMatchObject({
      status: "active",
      stage: "review",
      archived: false,
      archivedAt: null,
      previousStage: null,
    });
  });

  it("rejects a skipped stage transition before calling the repository", async () => {
    const projects = repository({ ...initialProject, stage: "draft" });
    const service = createProjectAdministration({ projects });

    await expect(
      service.update({ id: initialProject.id, actorId: "owner-1", stage: "review" }),
    ).rejects.toMatchObject({ code: "PROJECT_INVALID_STAGE_TRANSITION" });
    expect(projects.updates).toHaveLength(0);
  });
});
