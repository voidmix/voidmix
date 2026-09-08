import {
  studioSnapshotSchema,
  type HomeViewModel,
  type PiSessionView,
  type ProjectView,
  type TaskView,
  type StudioSnapshot,
} from "./types";

const storageKey = "voidmix.workspace.preview.v1";
const seed: StudioSnapshot = {
  version: 1,
  projects: [
    {
      id: "northstar",
      name: "Northstar / Launch film",
      description: "A clear story for the next chapter.",
      status: "active",
      milestone: "Final review",
      updatedAt: new Date("2026-09-06T08:00:00Z"),
    },
    {
      id: "campaign",
      name: "Q3 / Brand campaign",
      description: "Make the next campaign feel unmistakably ours.",
      status: "active",
      milestone: "Creative brief",
      updatedAt: new Date("2026-09-05T12:00:00Z"),
    },
    {
      id: "sound",
      name: "Northstar / Sound design",
      description: "A sonic identity for the launch.",
      status: "active",
      milestone: "Mix review",
      updatedAt: new Date("2026-09-04T10:00:00Z"),
    },
  ],
  tasks: [
    {
      id: "color",
      projectId: "northstar",
      title: "Approve final color pass",
      status: "blocked",
      owner: "Samira",
      priority: "high",
    },
    {
      id: "feedback",
      projectId: "northstar",
      title: "Consolidate the final feedback",
      status: "todo",
      owner: "Leo",
      priority: "high",
    },
    {
      id: "brief",
      projectId: "campaign",
      title: "Prepare the campaign brief",
      status: "todo",
      owner: "Mina",
      priority: "normal",
    },
    {
      id: "mix",
      projectId: "sound",
      title: "Review the first sound mix",
      status: "in_progress",
      owner: "Leo",
      priority: "normal",
    },
    {
      id: "lock",
      projectId: "northstar",
      title: "Confirm picture lock",
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
  createProject(name: string): ProjectView;
  updateProject(project: ProjectView): void;
  createTask(projectId: string, title: string): TaskView;
  updateTask(task: TaskView): void;
  removeTask(taskId: string): void;
  createSession(projectId: string, prompt: string): PiSessionView;
  updateSession(session: PiSessionView): void;
}

export function createProjectStudioPreviewAdapter(
  initial: StudioSnapshot = seed,
): ProjectStudioDataSource {
  let snapshot = structuredClone(initial);
  let hydrated = false;
  const listeners = new Set<() => void>();
  const id = () => crypto.randomUUID();
  function publish(next: StudioSnapshot) {
    snapshot = next;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      hydrated = true;
    }
    listeners.forEach((listener) => listener());
  }
  function activity(
    projectId: string,
    title: string,
    action: StudioSnapshot["activity"][number]["action"],
  ) {
    return [{ id: id(), projectId, title, action, at: new Date() }, ...snapshot.activity].slice(
      0,
      100,
    );
  }
  function requireProject(projectId: string) {
    if (!snapshot.projects.some((project) => project.id === projectId))
      throw new Error("Project not found");
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
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = studioSnapshotSchema.safeParse(JSON.parse(raw));
        if (parsed.success)
          publish({
            ...parsed.data,
            sessions: parsed.data.sessions.map((session) =>
              session.status === "running" ? { ...session, status: "cancelled" } : session,
            ),
          });
      } catch {
        return;
      }
    },
    getHome: () => homeView(snapshot),
    createProject(name) {
      const project: ProjectView = {
        id: id(),
        name: name.trim().slice(0, 120),
        description: "",
        status: "active",
        milestone: "",
        updatedAt: new Date(),
      };
      if (!project.name) throw new Error("A name is required");
      publish({
        ...snapshot,
        projects: [...snapshot.projects, project],
        activity: activity(project.id, project.name, "created"),
      });
      return project;
    },
    updateProject(project) {
      requireProject(project.id);
      if (!project.name.trim()) throw new Error("A name is required");
      publish({
        ...snapshot,
        projects: snapshot.projects.map((item) =>
          item.id === project.id ? { ...project, updatedAt: new Date() } : item,
        ),
        activity: activity(project.id, project.name, "updated"),
      });
    },
    createTask(projectId, title) {
      requireProject(projectId);
      const task: TaskView = {
        id: id(),
        projectId,
        title: title.trim().slice(0, 300),
        status: "todo",
        owner: "You",
        priority: "normal",
      };
      if (!task.title) throw new Error("A title is required");
      publish({
        ...snapshot,
        tasks: [...snapshot.tasks, task],
        activity: activity(projectId, task.title, "created"),
      });
      return task;
    },
    updateTask(task) {
      if (!snapshot.tasks.some((item) => item.id === task.id && item.projectId === task.projectId))
        throw new Error("Task not found");
      publish({
        ...snapshot,
        tasks: snapshot.tasks.map((item) => (item.id === task.id ? task : item)),
        activity: activity(task.projectId, task.title, "updated"),
      });
    },
    removeTask(taskId) {
      const task = snapshot.tasks.find((item) => item.id === taskId);
      if (task)
        publish({
          ...snapshot,
          tasks: snapshot.tasks.filter((item) => item.id !== taskId),
          activity: activity(task.projectId, task.title, "restored"),
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
      if (!previous) throw new Error("Session not found");
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
