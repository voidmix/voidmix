import { describe, expect, it } from "vite-plus/test";

import {
  canTransitionProjectStage,
  projectLifecycle,
  projectProgress,
  transitionProjectLifecycle,
  type Project,
  type ProjectTask,
} from "./model.js";

const project: Project = {
  id: "project-1",
  name: "Northstar",
  description: "Launch",
  status: "active",
  ownerId: "owner-1",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

function task(status: ProjectTask["status"]): ProjectTask {
  return {
    id: `task-${status}`,
    projectId: project.id,
    title: status,
    status,
    createdBy: "owner-1",
    updatedAt: project.updatedAt,
  };
}

describe("Project Studio lifecycle", () => {
  it("projects legacy statuses into canonical lifecycle values", () => {
    expect(projectLifecycle(project)).toMatchObject({
      stage: "in_progress",
      archived: false,
      archivedAt: null,
      previousStage: null,
    });
    expect(projectLifecycle({ ...project, status: "paused" })).toMatchObject({
      stage: "in_progress",
      archived: false,
    });
    expect(projectLifecycle({ ...project, status: "completed" })).toMatchObject({
      stage: "delivered",
      archived: false,
    });
    expect(projectLifecycle({ ...project, status: "archived" })).toMatchObject({
      stage: "draft",
      archived: true,
    });
  });

  it("allows the forward path and explicit reopen path only", () => {
    expect(canTransitionProjectStage("draft", "in_progress")).toBe(true);
    expect(canTransitionProjectStage("in_progress", "review")).toBe(true);
    expect(canTransitionProjectStage("review", "delivered")).toBe(true);
    expect(canTransitionProjectStage("delivered", "in_progress")).toBe(true);
    expect(canTransitionProjectStage("draft", "review")).toBe(false);
    expect(canTransitionProjectStage("delivered", "draft")).toBe(false);
  });

  it("archives independently and restores the prior stage", () => {
    const inReview = { ...project, stage: "review" as const };
    const archived = transitionProjectLifecycle(
      inReview,
      {
        archived: true,
      },
      () => new Date("2026-09-02T00:00:00.000Z"),
    );
    expect(archived).toMatchObject({
      stage: "review",
      archived: true,
      previousStage: "review",
    });

    expect(transitionProjectLifecycle({ ...inReview, ...archived }, { archived: false })).toEqual({
      stage: "review",
      archived: false,
      archivedAt: null,
      previousStage: null,
    });
  });

  it("returns null for empty task lists and projects completed-task ratio otherwise", () => {
    expect(projectProgress([])).toBeNull();
    expect(projectProgress([task("done"), task("todo"), task("done")])).toBe(2 / 3);
  });
});
