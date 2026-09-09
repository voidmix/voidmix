/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createTranslator } from "@voidmix/i18n";
import enMessages from "../../../messages/en.json";
import zhMessages from "../../../messages/zh.json";
import {
  createProjectStudioPreviewAdapter,
  legacyPreviewStorageKey,
  previewStorageKey,
  homeView,
} from "./preview-adapter";
import {
  displayActivityTitle,
  displayProjectDescription,
  displayProjectMilestone,
  displayProjectName,
  displayTaskOwner,
  displayTaskTitle,
} from "./preview-copy";
import type { StudioSnapshot } from "./types";
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

function metadataSnapshot(): StudioSnapshot {
  return {
    version: 1,
    projects: [
      {
        id: "metadata-project",
        name: "Northstar / Launch film",
        titleKey: "previewNorthstarLaunchFilmTitle",
        description: "A clear story for the next chapter.",
        descriptionKey: "previewNorthstarLaunchFilmDescription",
        status: "active",
        milestone: "Final review",
        milestoneKey: "previewFinalReviewMilestone",
        updatedAt: new Date("2026-09-06T08:00:00Z"),
      },
    ],
    tasks: [
      {
        id: "metadata-task",
        projectId: "metadata-project",
        title: "Approve final color pass",
        titleKey: "previewApproveFinalColorPass",
        status: "todo",
        owner: "You",
        ownerKey: "you",
        priority: "high",
      },
    ],
    activity: [
      {
        id: "metadata-activity",
        projectId: "metadata-project",
        title: "Approve final color pass",
        titleKey: "previewApproveFinalColorPass",
        action: "created",
        at: new Date("2026-09-06T07:00:00Z"),
      },
    ],
    sessions: [],
  };
}

const englishWorkspace = createTranslator({
  locale: "en",
  messages: enMessages,
  namespace: "workspaceUi",
});
const chineseWorkspace = createTranslator({
  locale: "zh",
  messages: zhMessages,
  namespace: "workspaceUi",
});

describe("workspace preview facade", () => {
  it("renders seeded preview metadata through the active en and zh catalogs", () => {
    const source = createProjectStudioPreviewAdapter();
    const project = source.getSnapshot().projects[0]!;
    const task = source.getSnapshot().tasks[0]!;

    expect({
      name: displayProjectName(project, englishWorkspace),
      description: displayProjectDescription(project, englishWorkspace),
      milestone: displayProjectMilestone(project, englishWorkspace),
      taskTitle: displayTaskTitle(task, englishWorkspace),
    }).toEqual({
      name: enMessages.workspaceUi.previewNorthstarLaunchFilmTitle,
      description: enMessages.workspaceUi.previewNorthstarLaunchFilmDescription,
      milestone: enMessages.workspaceUi.previewFinalReviewMilestone,
      taskTitle: enMessages.workspaceUi.previewApproveFinalColorPass,
    });
    expect({
      name: displayProjectName(project, chineseWorkspace),
      description: displayProjectDescription(project, chineseWorkspace),
      milestone: displayProjectMilestone(project, chineseWorkspace),
      taskTitle: displayTaskTitle(task, chineseWorkspace),
    }).toEqual({
      name: zhMessages.workspaceUi.previewNorthstarLaunchFilmTitle,
      description: zhMessages.workspaceUi.previewNorthstarLaunchFilmDescription,
      milestone: zhMessages.workspaceUi.previewFinalReviewMilestone,
      taskTitle: zhMessages.workspaceUi.previewApproveFinalColorPass,
    });
    expect(displayProjectName(project, englishWorkspace)).not.toBe(
      displayProjectName(project, chineseWorkspace),
    );
  });

  it("round-trips project, task, activity and owner metadata in the v2 envelope", async () => {
    const source = createProjectStudioPreviewAdapter(metadataSnapshot());
    await source.hydrate();

    const persisted = JSON.parse(sessionStorage.getItem(previewStorageKey)!);
    expect(persisted.data.projects[0]).toMatchObject({
      titleKey: "previewNorthstarLaunchFilmTitle",
      descriptionKey: "previewNorthstarLaunchFilmDescription",
      milestoneKey: "previewFinalReviewMilestone",
    });
    expect(persisted.data.tasks[0]).toMatchObject({
      titleKey: "previewApproveFinalColorPass",
      ownerKey: "you",
    });
    expect(persisted.data.activity[0]).toMatchObject({
      titleKey: "previewApproveFinalColorPass",
    });

    const restored = createProjectStudioPreviewAdapter();
    await restored.hydrate();
    expect(restored.getSnapshot().projects[0]).toMatchObject({
      titleKey: "previewNorthstarLaunchFilmTitle",
      descriptionKey: "previewNorthstarLaunchFilmDescription",
      milestoneKey: "previewFinalReviewMilestone",
    });
    expect(restored.getSnapshot().tasks[0]).toMatchObject({
      titleKey: "previewApproveFinalColorPass",
      ownerKey: "you",
    });
    expect(restored.getSnapshot().activity[0]).toMatchObject({
      titleKey: "previewApproveFinalColorPass",
    });
  });

  it("removes only the metadata key belonging to an edited project field", () => {
    const nameSource = createProjectStudioPreviewAdapter(metadataSnapshot());
    const nameBefore = nameSource.getSnapshot().projects[0]!;
    nameSource.updateProject({ ...nameBefore, name: "A new project name" });
    expect(nameSource.getSnapshot().projects[0]).toMatchObject({
      name: "A new project name",
      description: nameBefore.description,
      descriptionKey: nameBefore.descriptionKey,
      milestoneKey: nameBefore.milestoneKey,
    });
    expect(nameSource.getSnapshot().projects[0]).not.toHaveProperty("titleKey");

    const descriptionSource = createProjectStudioPreviewAdapter(metadataSnapshot());
    const descriptionBefore = descriptionSource.getSnapshot().projects[0]!;
    descriptionSource.updateProject({ ...descriptionBefore, description: "A new description" });
    expect(descriptionSource.getSnapshot().projects[0]).toMatchObject({
      name: descriptionBefore.name,
      titleKey: descriptionBefore.titleKey,
      description: "A new description",
      milestoneKey: descriptionBefore.milestoneKey,
    });
    expect(descriptionSource.getSnapshot().projects[0]).not.toHaveProperty("descriptionKey");

    const milestoneSource = createProjectStudioPreviewAdapter(metadataSnapshot());
    const milestoneBefore = milestoneSource.getSnapshot().projects[0]!;
    milestoneSource.updateProject({ ...milestoneBefore, milestone: "Delivery review" });
    expect(milestoneSource.getSnapshot().projects[0]).toMatchObject({
      name: milestoneBefore.name,
      titleKey: milestoneBefore.titleKey,
      descriptionKey: milestoneBefore.descriptionKey,
      milestone: "Delivery review",
    });
    expect(milestoneSource.getSnapshot().projects[0]).not.toHaveProperty("milestoneKey");
  });

  it("removes only the metadata key belonging to an edited task field", () => {
    const titleSource = createProjectStudioPreviewAdapter(metadataSnapshot());
    const titleBefore = titleSource.getSnapshot().tasks[0]!;
    titleSource.updateTask({ ...titleBefore, title: "A new task title" });
    expect(titleSource.getSnapshot().tasks[0]).toMatchObject({
      title: "A new task title",
      owner: titleBefore.owner,
      ownerKey: titleBefore.ownerKey,
    });
    expect(titleSource.getSnapshot().tasks[0]).not.toHaveProperty("titleKey");

    const ownerSource = createProjectStudioPreviewAdapter(metadataSnapshot());
    const ownerBefore = ownerSource.getSnapshot().tasks[0]!;
    ownerSource.updateTask({ ...ownerBefore, owner: "Samira" });
    expect(ownerSource.getSnapshot().tasks[0]).toMatchObject({
      title: ownerBefore.title,
      titleKey: ownerBefore.titleKey,
      owner: "Samira",
    });
    expect(ownerSource.getSnapshot().tasks[0]).not.toHaveProperty("ownerKey");
  });

  it("keeps raw fallback values and metadata for fields left untouched in a localized edit", () => {
    const source = createProjectStudioPreviewAdapter(metadataSnapshot());
    const projectBefore = source.getSnapshot().projects[0]!;
    const taskBefore = source.getSnapshot().tasks[0]!;
    const translatedDescription = displayProjectDescription(projectBefore, chineseWorkspace);
    const translatedOwner = displayTaskOwner(taskBefore, chineseWorkspace);

    expect(translatedDescription).not.toBe(projectBefore.description);
    expect(translatedOwner).not.toBe(taskBefore.owner);
    source.updateProject({ ...projectBefore, name: "Edited name" });
    source.updateTask({ ...taskBefore, title: "Edited title" });

    expect(source.getSnapshot().projects[0]).toMatchObject({
      description: projectBefore.description,
      descriptionKey: projectBefore.descriptionKey,
    });
    expect(source.getSnapshot().projects[0]?.description).not.toBe(translatedDescription);
    expect(source.getSnapshot().tasks[0]).toMatchObject({
      owner: taskBefore.owner,
      ownerKey: taskBefore.ownerKey,
    });
    expect(source.getSnapshot().tasks[0]?.owner).not.toBe(translatedOwner);
  });

  it("keeps activity title keys when a seeded task changes status or is removed", () => {
    const source = createProjectStudioPreviewAdapter(metadataSnapshot());
    const task = source.getSnapshot().tasks[0]!;

    source.updateTask({ ...task, status: "done" });
    const updated = source.getSnapshot().activity[0]!;
    expect(updated).toMatchObject({
      title: task.title,
      titleKey: task.titleKey,
      action: "updated",
    });
    expect(displayActivityTitle(updated, chineseWorkspace)).toBe(
      zhMessages.workspaceUi.previewApproveFinalColorPass,
    );

    source.removeTask(task.id);
    const restored = source.getSnapshot().activity[0]!;
    expect(restored).toMatchObject({
      title: task.title,
      titleKey: task.titleKey,
      action: "restored",
    });
    expect(displayActivityTitle(restored, chineseWorkspace)).toBe(
      zhMessages.workspaceUi.previewApproveFinalColorPass,
    );
  });

  it("retains preview metadata when undo restores the previous project and task", () => {
    const source = createProjectStudioPreviewAdapter(metadataSnapshot());
    const projectBefore = source.getSnapshot().projects[0]!;
    const taskBefore = source.getSnapshot().tasks[0]!;

    source.updateProject({ ...projectBefore, name: "Edited name" });
    source.updateProject(projectBefore);
    source.updateTask({ ...taskBefore, title: "Edited title" });
    source.updateTask(taskBefore);

    expect(source.getSnapshot().projects[0]).toMatchObject({
      name: projectBefore.name,
      titleKey: projectBefore.titleKey,
      descriptionKey: projectBefore.descriptionKey,
      milestoneKey: projectBefore.milestoneKey,
    });
    expect(source.getSnapshot().tasks[0]).toMatchObject({
      title: taskBefore.title,
      titleKey: taskBefore.titleKey,
      ownerKey: taskBefore.ownerKey,
    });
    const persisted = JSON.parse(sessionStorage.getItem(previewStorageKey)!);
    expect(persisted.data.projects[0]).toMatchObject({
      titleKey: projectBefore.titleKey,
      descriptionKey: projectBefore.descriptionKey,
      milestoneKey: projectBefore.milestoneKey,
    });
    expect(persisted.data.tasks[0]).toMatchObject({
      titleKey: taskBefore.titleKey,
      ownerKey: taskBefore.ownerKey,
    });
  });

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
    expect(() => source.updateTask({ ...task, projectId: "campaign" })).toThrow(
      expect.objectContaining({ code: "TASK_NOT_FOUND" }),
    );
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
