/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createProjectStudioPreviewAdapter,
  legacyPreviewStorageKey,
  previewStorageKey,
  homeView,
} from "./preview-adapter";
import { projectSearch } from "./types";

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

function legacySnapshot(status: "active" | "paused" | "completed" | "archived" = "active") {
  return {
    version: 1 as const,
    projects: [
      {
        id: "legacy-project",
        name: "Legacy project",
        description: "Migrated project",
        status,
        milestone: "Old milestone",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    tasks: [],
    activity: [
      {
        id: "legacy-activity",
        projectId: "legacy-project",
        title: "Old activity",
        action: "updated" as const,
        at: "2026-09-02T00:00:00.000Z",
      },
    ],
    sessions: [],
  };
}

describe("workspace preview facade", () => {
  it("returns bounded home summaries instead of entire task histories", () => {
    const source = createProjectStudioPreviewAdapter();
    for (let count = 0; count < 9; count++) source.createTask("northstar", `Task ${count}`);
    const home = source.getHome();
    expect(home.attention).toHaveLength(5);
    expect(home.attention[0]?.status).toBe("blocked");
    expect(home.projects[0]).toMatchObject({ id: "northstar", blocked: 1, complete: 1 });
  });
  it("persists projects, tasks and sessions for direct navigation and refresh", async () => {
    const first = createProjectStudioPreviewAdapter();
    const project = first.createProject("A new project");
    const task = first.createTask(project.id, "Ship it");
    const session = first.createSession(project.id, "Plan it");
    const restored = createProjectStudioPreviewAdapter();
    await restored.hydrate();
    expect(
      restored.getSnapshot().projects.find((item) => item.id === project.id)?.updatedAt,
    ).toBeInstanceOf(Date);
    expect(restored.getSnapshot().tasks).toContainEqual(task);
    expect(restored.getSnapshot().sessions).toContainEqual(session);
  });
  it("marks an interrupted preview run as stopped on reload", async () => {
    const source = createProjectStudioPreviewAdapter();
    const session = source.createSession("northstar", "Ship it");
    source.updateSession({ ...session, status: "running" });
    const restored = createProjectStudioPreviewAdapter();
    await restored.hydrate();
    expect(restored.getSnapshot().sessions[0]?.status).toBe("cancelled");
  });
  it("migrates v1 into a v2 envelope while retaining the legacy value", async () => {
    const v1 = legacySnapshot();
    sessionStorage.setItem(legacyPreviewStorageKey, JSON.stringify(v1));
    const source = createProjectStudioPreviewAdapter();

    await source.hydrate();

    const migrated = JSON.parse(sessionStorage.getItem(previewStorageKey)!);
    expect(migrated).toMatchObject({
      version: 2,
      migratedFrom: 1,
      data: {
        projects: [
          {
            id: "legacy-project",
            title: "Legacy project",
            stage: "in_progress",
            archived: false,
            legacyStatus: "active",
            stageWasDefaulted: false,
            cover: null,
            thumbnail: null,
            deadline: null,
          },
        ],
        assets: [],
        reviews: [],
        projectMembers: [],
      },
    });
    expect(sessionStorage.getItem(legacyPreviewStorageKey)).toBe(JSON.stringify(v1));
    expect(source.getSnapshot().projects[0]?.updatedAt).toBeInstanceOf(Date);
    expect(source.getSnapshot().activity[0]?.at).toBeInstanceOf(Date);
  });
  it.each([
    ["active", "in_progress", false],
    ["paused", "in_progress", false],
    ["completed", "delivered", false],
    ["archived", "draft", true],
  ] as const)("maps legacy %s status to %s", async (status, stage, archived) => {
    sessionStorage.setItem(legacyPreviewStorageKey, JSON.stringify(legacySnapshot(status)));
    await createProjectStudioPreviewAdapter().hydrate();

    const migrated = JSON.parse(sessionStorage.getItem(previewStorageKey)!);
    expect(migrated.data.projects[0]).toMatchObject({
      stage,
      archived,
      legacyStatus: status,
      stageWasDefaulted: archived,
    });
  });
  it("does not repeat a completed migration", async () => {
    sessionStorage.setItem(legacyPreviewStorageKey, JSON.stringify(legacySnapshot()));
    const first = createProjectStudioPreviewAdapter();
    await first.hydrate();
    first.createTask("legacy-project", "Keep the marker");
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    await createProjectStudioPreviewAdapter().hydrate();

    expect(setItem).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(previewStorageKey)!).migratedFrom).toBe(1);
  });
  it.each([
    { version: 3, migratedFrom: 1, data: {} },
    { version: 2, migratedFrom: 1, data: { projects: "bad" } },
  ])("preserves an unknown or invalid v2 value without using v1", async (value) => {
    const v1 = legacySnapshot();
    sessionStorage.setItem(previewStorageKey, JSON.stringify(value));
    sessionStorage.setItem(legacyPreviewStorageKey, JSON.stringify(v1));
    const source = createProjectStudioPreviewAdapter();

    await source.hydrate();

    expect(sessionStorage.getItem(previewStorageKey)).toBe(JSON.stringify(value));
    expect(source.getSnapshot().projects).toHaveLength(3);
    source.createProject("Memory only");
    expect(sessionStorage.getItem(previewStorageKey)).toBe(JSON.stringify(value));
  });
  it("exposes a persistence warning and retains v1 when v2 writing fails", async () => {
    const v1 = legacySnapshot();
    sessionStorage.setItem(legacyPreviewStorageKey, JSON.stringify(v1));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const source = createProjectStudioPreviewAdapter();

    await source.hydrate();

    expect(source.getPersistenceWarning()).toBe(true);
    expect(sessionStorage.getItem(previewStorageKey)).toBeNull();
    expect(sessionStorage.getItem(legacyPreviewStorageKey)).toBe(JSON.stringify(v1));
    expect(source.getSnapshot().projects[0]?.id).toBe("legacy-project");
  });
  it("recovers from corrupted storage without losing the preview entry point", async () => {
    sessionStorage.setItem("voidmix.workspace.preview.v1", "{broken");
    const source = createProjectStudioPreviewAdapter();
    await source.hydrate();
    expect(source.getHome().projects).toHaveLength(3);
  });
  it("rejects invalid stored data", async () => {
    sessionStorage.setItem(
      "voidmix.workspace.preview.v1",
      JSON.stringify({ version: 1, projects: [{ id: "bad" }] }),
    );
    const source = createProjectStudioPreviewAdapter();
    await source.hydrate();
    expect(source.getHome().projects).toHaveLength(3);
  });
  it("does not mutate tasks across projects", () => {
    const source = createProjectStudioPreviewAdapter();
    const task = source.getSnapshot().tasks[0]!;
    expect(() => source.updateTask({ ...task, projectId: "campaign" })).toThrow("Task not found");
  });
  it("supports undoing a task update and removing a newly created task", () => {
    const source = createProjectStudioPreviewAdapter();
    const original = source.getSnapshot().tasks[0]!;
    source.updateTask({ ...original, status: "done" });
    source.updateTask(original);
    expect(source.getSnapshot().tasks[0]).toEqual(original);
    const task = source.createTask("northstar", "Undo me");
    source.removeTask(task.id);
    expect(source.getSnapshot().tasks.some((item) => item.id === task.id)).toBe(false);
  });
  it("hides archived projects and their tasks from Home but keeps them in the snapshot", () => {
    const source = createProjectStudioPreviewAdapter();
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
