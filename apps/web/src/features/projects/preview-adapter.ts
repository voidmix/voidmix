import {
  studioPreviewDataSchema,
  studioPreviewEnvelopeSchema,
  studioSnapshotSchema,
  type HomeViewModel,
  type LibrarySearchView,
  type PiSessionView,
  type ProjectAssetView,
  type ProjectView,
  type StudioPreviewData,
  type StudioPreviewEnvelope,
  type StudioAssetReference,
  type TaskView,
  type StudioSnapshot,
  type ActivityView,
} from "./types";
import { LocalizedWebError } from "../../i18n/error-message";
import { withoutChangedProjectPreviewCopy, withoutChangedTaskPreviewCopy } from "./preview-copy";

export const previewStorageKey = "voidmix.project-studio.preview.v2";
export const legacyPreviewStorageKey = "voidmix.workspace.preview.v1";
const seed: StudioSnapshot = {
  version: 1,
  projects: [
    {
      id: "northstar",
      name: "Northstar / Launch film",
      titleKey: "previewNorthstarLaunchFilmTitle",
      description: "A clear story for the next chapter.",
      descriptionKey: "previewNorthstarLaunchFilmDescription",
      status: "active",
      milestone: "Final review",
      milestoneKey: "previewFinalReviewMilestone",
      updatedAt: new Date("2026-09-06T08:00:00Z"),
    },
    {
      id: "campaign",
      name: "Q3 / Brand campaign",
      titleKey: "previewBrandCampaignTitle",
      description: "Make the next campaign feel unmistakably ours.",
      descriptionKey: "previewBrandCampaignDescription",
      status: "active",
      milestone: "Creative brief",
      milestoneKey: "previewCreativeBriefMilestone",
      updatedAt: new Date("2026-09-05T12:00:00Z"),
    },
    {
      id: "sound",
      name: "Northstar / Sound design",
      titleKey: "previewSoundDesignTitle",
      description: "A sonic identity for the launch.",
      descriptionKey: "previewSoundDesignDescription",
      status: "active",
      milestone: "Mix review",
      milestoneKey: "previewMixReviewMilestone",
      updatedAt: new Date("2026-09-04T10:00:00Z"),
    },
  ],
  tasks: [
    {
      id: "color",
      projectId: "northstar",
      title: "Approve final color pass",
      titleKey: "previewApproveFinalColorPass",
      status: "blocked",
      owner: "Samira",
      priority: "high",
    },
    {
      id: "feedback",
      projectId: "northstar",
      title: "Consolidate the final feedback",
      titleKey: "previewConsolidateFinalFeedback",
      status: "todo",
      owner: "Leo",
      priority: "high",
    },
    {
      id: "brief",
      projectId: "campaign",
      title: "Prepare the campaign brief",
      titleKey: "previewPrepareCampaignBrief",
      status: "todo",
      owner: "Mina",
      priority: "normal",
    },
    {
      id: "mix",
      projectId: "sound",
      title: "Review the first sound mix",
      titleKey: "previewReviewFirstSoundMix",
      status: "in_progress",
      owner: "Leo",
      priority: "normal",
    },
    {
      id: "lock",
      projectId: "northstar",
      title: "Confirm picture lock",
      titleKey: "previewConfirmPictureLock",
      status: "done",
      owner: "Samira",
      priority: "normal",
    },
  ],
  activity: [
    {
      id: "lock-event",
      projectId: "northstar",
      title: "Confirm picture lock",
      titleKey: "previewConfirmPictureLock",
      action: "completed",
      at: new Date("2026-09-06T07:00:00Z"),
    },
  ],
  sessions: [],
};

export interface ProjectStudioDataSource {
  getSnapshot(this: void): StudioSnapshot;
  subscribe(this: void, listener: () => void): () => void;
  hydrate(): void | Promise<void>;
  getHome(): HomeViewModel;
  getProjectAssets(projectId: string): ProjectAssetView[];
  searchLibrary?(query: string): Promise<LibrarySearchView>;
  createProject(name: string): ProjectView;
  updateProject(project: ProjectView): void;
  createTask(projectId: string, title: string): TaskView;
  updateTask(task: TaskView): void;
  removeTask(taskId: string): void;
  uploadAsset?(projectId: string, file: File): Promise<StudioAssetReference>;
  attachAsset?(
    projectId: string,
    assetId: string,
    versionId?: string | null,
  ): Promise<StudioAssetReference>;
  createSession(projectId: string, prompt: string): PiSessionView;
  startSession?(session: PiSessionView): Promise<PiSessionView>;
  updateSession(session: PiSessionView): void;
  getPersistenceWarning(this: void): boolean;
}

function projectToPreviewData(project: ProjectView) {
  const stage =
    project.status === "completed"
      ? "delivered"
      : project.status === "archived"
        ? "draft"
        : "in_progress";
  return {
    id: project.id,
    title: project.name,
    ...(project.titleKey ? { titleKey: project.titleKey } : {}),
    description: project.description,
    ...(project.descriptionKey ? { descriptionKey: project.descriptionKey } : {}),
    stage,
    archived: project.status === "archived",
    legacyStatus: project.status,
    stageWasDefaulted: project.status === "archived",
    cover: null,
    thumbnail: null,
    deadline: null,
    milestone: project.milestone,
    ...(project.milestoneKey ? { milestoneKey: project.milestoneKey } : {}),
    updatedAt: project.updatedAt,
  };
}

function snapshotToPreviewData(snapshot: StudioSnapshot): StudioPreviewData {
  return studioPreviewDataSchema.parse({
    projects: snapshot.projects.map(projectToPreviewData),
    tasks: snapshot.tasks,
    activity: snapshot.activity,
    sessions: snapshot.sessions,
    assets: [],
    reviews: [],
    projectMembers: [],
  });
}

function previewDataToSnapshot(data: StudioPreviewData): StudioSnapshot {
  return {
    version: 1,
    projects: data.projects.map((project) => ({
      id: project.id,
      name: project.title,
      ...(project.titleKey ? { titleKey: project.titleKey } : {}),
      description: project.description,
      ...(project.descriptionKey ? { descriptionKey: project.descriptionKey } : {}),
      status: project.archived
        ? "archived"
        : project.stage === "delivered"
          ? "completed"
          : project.legacyStatus === "paused"
            ? "paused"
            : "active",
      milestone: project.milestone,
      ...(project.milestoneKey ? { milestoneKey: project.milestoneKey } : {}),
      updatedAt: project.updatedAt,
    })),
    tasks: data.tasks,
    activity: data.activity,
    sessions: data.sessions,
  };
}

function envelopeFor(snapshot: StudioSnapshot, migratedFrom: 1 | null): StudioPreviewEnvelope {
  return studioPreviewEnvelopeSchema.parse({
    version: 2,
    migratedFrom,
    data: snapshotToPreviewData(snapshot),
  });
}

function migrateV1(snapshot: StudioSnapshot): StudioPreviewEnvelope {
  return envelopeFor(snapshot, 1);
}

function cancelRunningSessions(snapshot: StudioSnapshot): StudioSnapshot {
  return {
    ...snapshot,
    sessions: snapshot.sessions.map((session) =>
      session.status === "running" ? { ...session, status: "cancelled" } : session,
    ),
  };
}

export function createProjectStudioPreviewAdapter(
  initial: StudioSnapshot = seed,
): ProjectStudioDataSource {
  let snapshot = structuredClone(initial);
  let hydrated = false;
  let persistenceWarning = false;
  let migratedFrom: 1 | null = null;
  let storageWriteBlocked = false;
  const listeners = new Set<() => void>();
  const id = () => crypto.randomUUID();
  function notify() {
    listeners.forEach((listener) => listener());
  }
  function persist(next: StudioSnapshot, migratedFrom: 1 | null = null) {
    if (storageWriteBlocked) return false;
    try {
      sessionStorage.setItem(previewStorageKey, JSON.stringify(envelopeFor(next, migratedFrom)));
      persistenceWarning = false;
      return true;
    } catch {
      persistenceWarning = true;
      return false;
    }
  }
  function publish(next: StudioSnapshot) {
    snapshot = next;
    persist(next, migratedFrom);
    notify();
  }
  function activity(
    projectId: string,
    title: string,
    action: StudioSnapshot["activity"][number]["action"],
    titleKey?: ActivityView["titleKey"],
  ) {
    return [
      { id: id(), projectId, title, ...(titleKey ? { titleKey } : {}), action, at: new Date() },
      ...snapshot.activity,
    ].slice(0, 100);
  }
  function requireProject(projectId: string) {
    if (!snapshot.projects.some((project) => project.id === projectId))
      throw new LocalizedWebError("PROJECT_NOT_FOUND");
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate() {
      if (hydrated || typeof window === "undefined") return;
      hydrated = true;
      try {
        const storedV2 = sessionStorage.getItem(previewStorageKey);
        if (storedV2 !== null) {
          let decodedV2: unknown;
          try {
            decodedV2 = JSON.parse(storedV2);
          } catch {
            storageWriteBlocked = true;
            return;
          }
          const parsedV2 = studioPreviewEnvelopeSchema.safeParse(decodedV2);
          if (!parsedV2.success) {
            storageWriteBlocked = true;
            return;
          }
          migratedFrom = parsedV2.data.migratedFrom;
          const restored = cancelRunningSessions(previewDataToSnapshot(parsedV2.data.data));
          snapshot = restored;
          if (
            restored.sessions.some(
              (session, index) => session !== parsedV2.data.data.sessions[index],
            )
          )
            persist(restored, parsedV2.data.migratedFrom);
          notify();
          return;
        }

        const storedV1 = sessionStorage.getItem(legacyPreviewStorageKey);
        if (storedV1 !== null) {
          const parsedV1 = studioSnapshotSchema.safeParse(JSON.parse(storedV1));
          if (!parsedV1.success) {
            persist(snapshot);
            return;
          }
          const migrated = migrateV1(parsedV1.data);
          const restored = cancelRunningSessions(previewDataToSnapshot(migrated.data));
          migratedFrom = 1;
          persist(restored, migratedFrom);
          snapshot = restored;
          notify();
          return;
        }

        persist(snapshot);
      } catch {
        return;
      }
    },
    getHome: () => homeView(snapshot),
    getProjectAssets: () => [],
    getPersistenceWarning: () => persistenceWarning,
    createProject(name) {
      const project: ProjectView = {
        id: id(),
        name: name.trim().slice(0, 120),
        description: "",
        status: "active",
        milestone: "",
        updatedAt: new Date(),
      };
      if (!project.name) throw new LocalizedWebError("PROJECT_NAME_REQUIRED");
      publish({
        ...snapshot,
        projects: [...snapshot.projects, project],
        activity: activity(project.id, project.name, "created"),
      });
      return project;
    },
    updateProject(project) {
      const previous = snapshot.projects.find((item) => item.id === project.id);
      requireProject(project.id);
      const editableProject = previous
        ? withoutChangedProjectPreviewCopy(previous, project)
        : project;
      if (!editableProject.name.trim()) throw new LocalizedWebError("PROJECT_NAME_REQUIRED");
      publish({
        ...snapshot,
        projects: snapshot.projects.map((item) =>
          item.id === editableProject.id ? { ...editableProject, updatedAt: new Date() } : item,
        ),
        activity: activity(
          editableProject.id,
          editableProject.name,
          "updated",
          editableProject.titleKey,
        ),
      });
    },
    createTask(projectId, title) {
      requireProject(projectId);
      const task: TaskView = {
        id: id(),
        projectId,
        title: title.trim().slice(0, 300),
        ownerKey: "you",
        status: "todo",
        owner: "You",
        priority: "normal",
      };
      if (!task.title) throw new LocalizedWebError("TASK_TITLE_REQUIRED");
      publish({
        ...snapshot,
        tasks: [...snapshot.tasks, task],
        activity: activity(projectId, task.title, "created"),
      });
      return task;
    },
    updateTask(task) {
      const previous = snapshot.tasks.find(
        (item) => item.id === task.id && item.projectId === task.projectId,
      );
      if (!previous) throw new LocalizedWebError("TASK_NOT_FOUND");
      const editableTask = withoutChangedTaskPreviewCopy(previous, task);
      publish({
        ...snapshot,
        tasks: snapshot.tasks.map((item) => (item.id === editableTask.id ? editableTask : item)),
        activity: activity(
          editableTask.projectId,
          editableTask.title,
          "updated",
          editableTask.titleKey,
        ),
      });
    },
    removeTask(taskId) {
      const task = snapshot.tasks.find((item) => item.id === taskId);
      if (task)
        publish({
          ...snapshot,
          tasks: snapshot.tasks.filter((item) => item.id !== taskId),
          activity: activity(task.projectId, task.title, "restored", task.titleKey),
        });
    },
    createSession(projectId, prompt) {
      requireProject(projectId);
      const session: PiSessionView = {
        id: id(),
        projectId,
        prompt: prompt.trim(),
        status: "idle",
        steps: [],
        taskId: null,
      };
      publish({ ...snapshot, sessions: [...snapshot.sessions, session] });
      return session;
    },
    updateSession(session) {
      const previous = snapshot.sessions.find(
        (item) => item.id === session.id && item.projectId === session.projectId,
      );
      if (!previous) throw new LocalizedWebError("SESSION_NOT_FOUND");
      const changed = previous.status !== session.status;
      const status = session.status;
      const terminal = status === "completed" || status === "cancelled" || status === "failed";
      publish({
        ...snapshot,
        sessions: snapshot.sessions.map((item) => (item.id === session.id ? session : item)),
        activity:
          changed && terminal
            ? activity(session.projectId, `Pi / ${session.prompt}`, status)
            : snapshot.activity,
      });
    },
  };
}

export function homeView(snapshot: StudioSnapshot): HomeViewModel {
  return {
    projects: snapshot.projects
      .filter((project) => project.status !== "archived")
      .map((project) => {
        const tasks = snapshot.tasks.filter((task) => task.projectId === project.id);
        return {
          ...project,
          blocked: tasks.filter((task) => task.status === "blocked").length,
          complete: tasks.filter((task) => task.status === "done").length,
          total: tasks.length,
        };
      }),
    attention: snapshot.tasks
      .filter((task) => task.status === "blocked" || task.status === "todo")
      .filter((task) =>
        snapshot.projects.some(
          (project) => project.id === task.projectId && project.status !== "archived",
        ),
      )
      .sort((left, right) => Number(right.status === "blocked") - Number(left.status === "blocked"))
      .slice(0, 5),
    activity: snapshot.activity.slice(0, 5),
  };
}
