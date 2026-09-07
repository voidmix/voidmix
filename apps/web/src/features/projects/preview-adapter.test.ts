/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { createPreviewAdapter, homeView } from "./preview-adapter";
import { projectSearch } from "./types";

beforeEach(() => sessionStorage.clear());

describe("workspace preview facade", () => {
  it("returns bounded home summaries instead of entire task histories", () => {
    const source = createPreviewAdapter();
    for (let count = 0; count < 9; count++) source.createTask("northstar", `Task ${count}`);
    const home = source.getHome();
    expect(home.attention).toHaveLength(5);
    expect(home.attention[0]?.status).toBe("blocked");
    expect(home.projects[0]).toMatchObject({ id: "northstar", blocked: 1, complete: 1 });
  });
  it("persists projects, tasks and sessions for direct navigation and refresh", async () => {
    const first = createPreviewAdapter();
    const project = first.createProject("A new project");
    const task = first.createTask(project.id, "Ship it");
    const session = first.createSession(project.id, "Plan it");
    const restored = createPreviewAdapter();
    await restored.hydrate();
    expect(
      restored.getSnapshot().projects.find((item) => item.id === project.id)?.updatedAt,
    ).toBeInstanceOf(Date);
    expect(restored.getSnapshot().tasks).toContainEqual(task);
    expect(restored.getSnapshot().sessions).toContainEqual(session);
  });
  it("marks an interrupted preview run as stopped on reload", async () => {
    const source = createPreviewAdapter();
    const session = source.createSession("northstar", "Ship it");
    source.updateSession({ ...session, status: "running" });
    const restored = createPreviewAdapter();
    await restored.hydrate();
    expect(restored.getSnapshot().sessions[0]?.status).toBe("cancelled");
  });
  it("recovers from corrupted storage without losing the preview entry point", async () => {
    sessionStorage.setItem("voidmix.workspace.preview.v1", "{broken");
    const source = createPreviewAdapter();
    await source.hydrate();
    expect(source.getHome().projects).toHaveLength(3);
  });
  it("rejects invalid stored data", async () => {
    sessionStorage.setItem(
      "voidmix.workspace.preview.v1",
      JSON.stringify({ version: 1, projects: [{ id: "bad" }] }),
    );
    const source = createPreviewAdapter();
    await source.hydrate();
    expect(source.getHome().projects).toHaveLength(3);
  });
  it("does not mutate tasks across projects", () => {
    const source = createPreviewAdapter();
    const task = source.getSnapshot().tasks[0]!;
    expect(() => source.updateTask({ ...task, projectId: "campaign" })).toThrow("Task not found");
  });
  it("supports undoing a task update and removing a newly created task", () => {
    const source = createPreviewAdapter();
    const original = source.getSnapshot().tasks[0]!;
    source.updateTask({ ...original, status: "done" });
    source.updateTask(original);
    expect(source.getSnapshot().tasks[0]).toEqual(original);
    const task = source.createTask("northstar", "Undo me");
    source.removeTask(task.id);
    expect(source.getSnapshot().tasks.some((item) => item.id === task.id)).toBe(false);
  });
  it("hides archived projects and their tasks from Home but keeps them in the snapshot", () => {
    const source = createPreviewAdapter();
    source.updateProject({ ...source.getSnapshot().projects[0]!, status: "archived" });
    expect(source.getHome().projects.some((project) => project.id === "northstar")).toBe(false);
    expect(source.getHome().attention.some((task) => task.projectId === "northstar")).toBe(false);
    expect(source.getSnapshot().projects).toHaveLength(3);
  });
  it("supports empty workspaces", () => {
    expect(homeView({ version: 1, projects: [], tasks: [], sessions: [], activity: [] })).toEqual({
      projects: [],
      attention: [],
      activity: [],
    });
  });
  it("normalizes URL filters without discarding valid project tab state", () => {
    expect(projectSearch({ tab: "tasks", filter: "blocked" })).toEqual({
      tab: "tasks",
      filter: "blocked",
    });
    expect(projectSearch({ tab: "unknown", filter: "wrong" })).toEqual({
      tab: "overview",
      filter: "all",
    });
  });
});
