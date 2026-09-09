import { createApiClient, type ApiClient } from "@voidmix/client";

import { homeView, type ProjectStudioDataSource } from "./preview-adapter";
import { LocalizedWebError } from "../../i18n/error-message";
import type {
  ActivityView,
  LibrarySearchView,
  PiSessionView,
  ProjectView,
  StudioAsset,
  StudioAssetReference,
  StudioAssetVersion,
  StudioSnapshot,
  TaskView,
} from "./types";

type StudioSnapshotDto = Awaited<ReturnType<ApiClient["studio"]["snapshot"]["get"]>>;
type ProjectSummaryDto = Awaited<ReturnType<ApiClient["projects"]["list"]>>["items"][number];
type ProjectDetailDto = Awaited<ReturnType<ApiClient["projects"]["get"]>>;
type ProjectTaskDto = Awaited<ReturnType<ApiClient["projects"]["tasks"]["list"]>>["items"][number];
type ActivityDto = Awaited<ReturnType<ApiClient["activity"]["list"]>>["items"][number];
type PiSessionDto = StudioSnapshotDto["activeSessions"][number];
type TaskOwnerContext = Pick<StudioSnapshotDto["account"], "id" | "displayName">;
type LibraryAssetDto = Awaited<ReturnType<ApiClient["library"]["search"]>>["assets"][number];
type LibraryVersionDto = Awaited<ReturnType<ApiClient["library"]["search"]>>["versions"][number];
type AssetReferenceDto = Awaited<
  ReturnType<ApiClient["projects"]["get"]>
>["assetReferences"][number];
type AssetUploadAttempt = {
  asset: StudioAsset;
  idempotencyKey: string;
  committed?: { asset: StudioAsset; version: StudioAssetVersion };
};

export interface CreateProjectStudioRemoteAdapterOptions {
  client?: ApiClient;
  workspaceId?: string;
}

const emptySnapshot: StudioSnapshot = {
  version: 1,
  projects: [],
  tasks: [],
  activity: [],
  sessions: [],
};

function toAssetView(asset: LibraryAssetDto): StudioAsset {
  return { ...asset };
}

function toVersionView(version: LibraryVersionDto): StudioAssetVersion {
  return { ...version };
}

function toAssetReferenceView(reference: AssetReferenceDto): StudioAssetReference {
  return { ...reference };
}

function projectStatus(project: ProjectSummaryDto): ProjectView["status"] {
  if (project.archived) return "archived";
  if (project.stage === "delivered") return "completed";
  return "active";
}

function toProjectView(project: ProjectSummaryDto): ProjectView {
  return {
    id: project.id,
    name: project.title,
    description: project.description ?? "",
    status: projectStatus(project),
    milestone: "",
    updatedAt: project.updatedAt,
  };
}

function toTaskView(task: ProjectTaskDto, account?: TaskOwnerContext): TaskView {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    status: task.status,
    ...(account?.id === task.createdBy
      ? { owner: account.displayName, ownerKey: "you" as const }
      : { owner: task.createdBy }),
    priority: "normal",
  };
}

function activityAction(activity: ActivityDto): ActivityView["action"] {
  switch (activity.type) {
    case "pi.session.completed":
      return "completed";
    case "pi.session.started":
      return "created";
    case "project.archived":
      return "restored";
    default:
      return activity.type.endsWith("created") ? "created" : "updated";
  }
}

function toActivityView(activity: ActivityDto): ActivityView | null {
  if (!activity.projectId) return null;
  return {
    id: activity.id,
    projectId: activity.projectId,
    title: activity.summary,
    action: activityAction(activity),
    at: activity.occurredAt,
  };
}

function sessionStatus(session: PiSessionDto): PiSessionView["status"] {
  switch (session.status) {
    case "queued":
    case "waiting_for_approval":
      return "idle";
    case "succeeded":
      return "completed";
    default:
      return session.status;
  }
}

function toSessionView(session: PiSessionDto): PiSessionView {
  return {
    id: session.id,
    projectId: session.projectId,
    prompt: session.prompt,
    status: sessionStatus(session),
    steps: [],
    taskId: null,
  };
}

async function snapshotFromDto(
  client: ApiClient,
  snapshot: StudioSnapshotDto,
): Promise<StudioSnapshot> {
  const [details, library] = await Promise.all([
    Promise.all(snapshot.projects.map((project) => client.projects.get({ projectId: project.id }))),
    client.library.search({ limit: 100 }),
  ]);
  return {
    version: 1,
    projects: snapshot.projects.map(toProjectView),
    tasks: details.flatMap((project) =>
      project.tasks.map((task) => toTaskView(task, snapshot.account)),
    ),
    activity: snapshot.recentActivity
      .map(toActivityView)
      .filter((activity): activity is ActivityView => activity !== null),
    sessions: snapshot.activeSessions.map(toSessionView),
    assets: library.assets.map(toAssetView),
    versions: library.versions.map(toVersionView),
    assetReferences: details.flatMap((project) =>
      project.assetReferences.map(toAssetReferenceView),
    ),
  };
}

/**
 * Live Web facade for the shared Project Studio data shape. It keeps the
 * existing synchronous view contract while writes are optimistic and a failed
 * request is surfaced through the persistence warning and rollback path.
 */
export function createProjectStudioRemoteAdapter(
  options: CreateProjectStudioRemoteAdapterOptions = {},
): ProjectStudioDataSource {
  const client = options.client ?? createApiClient();
  let snapshot = structuredClone(emptySnapshot);
  let persistenceWarning = false;
  let hydrated = false;
  let defaultWorkspaceId = options.workspaceId;
  let account: TaskOwnerContext | undefined;
  const projectWorkspaceIds = new Map<string, string>();
  const uploads = new WeakMap<File, Map<string, AssetUploadAttempt>>();
  const remoteSessionIds = new Set<string>();
  const listeners = new Set<() => void>();

  const id = () => crypto.randomUUID();
  const notify = () => listeners.forEach((listener) => listener());
  const publish = (next: StudioSnapshot) => {
    snapshot = next;
    notify();
  };
  const fail = () => {
    persistenceWarning = true;
    notify();
  };
  const project = (projectId: string) => snapshot.projects.find((item) => item.id === projectId);
  const projectStage = (value: ProjectView): ProjectSummaryDto["stage"] =>
    value.status === "completed"
      ? "delivered"
      : value.status === "archived"
        ? "draft"
        : "in_progress";

  const attachAsset = async (projectId: string, assetId: string, versionId?: string | null) => {
    const [page, asset, versions] = await Promise.all([
      client.projects.assets.list({ projectId, limit: 100 }),
      client.workspace.assets.get({ assetId }),
      client.library.versions.list({ assetId, limit: 100 }),
    ]);
    if (asset.workspaceId !== projectWorkspaceIds.get(projectId))
      throw new LocalizedWebError("ASSET_NOT_ALLOWED");
    const existing = page.items.find((reference) => reference.assetId === assetId);
    const reference =
      existing ??
      (await client.projects.assets.create({
        projectId,
        assetId,
        versionId: versionId ?? null,
      }));
    const value = toAssetReferenceView(reference);
    publish({
      ...snapshot,
      assets: [...(snapshot.assets ?? []).filter((item) => item.id !== asset.id), asset],
      versions: [
        ...(snapshot.versions ?? []).filter(
          (item) => !versions.items.some((value) => value.id === item.id),
        ),
        ...versions.items,
      ],
      assetReferences: [
        ...(snapshot.assetReferences ?? []).filter((item) => item.id !== value.id),
        value,
      ],
    });
    return value;
  };

  const reconcileProject = (value: ProjectDetailDto, optimisticId?: string) => {
    const nextProject = toProjectView(value);
    const targetId = optimisticId ?? nextProject.id;
    const hasTarget = snapshot.projects.some((item) => item.id === targetId);
    const hasRemote = snapshot.projects.some((item) => item.id === nextProject.id);
    const projects = hasTarget
      ? snapshot.projects.map((item) => (item.id === targetId ? nextProject : item))
      : optimisticId && !hasRemote
        ? [...snapshot.projects, nextProject]
        : snapshot.projects;
    projectWorkspaceIds.set(nextProject.id, value.workspaceId);
    publish({
      ...snapshot,
      projects,
      tasks: [
        ...snapshot.tasks.filter((item) => item.projectId !== nextProject.id),
        ...value.tasks.map((task) => toTaskView(task, account)),
      ],
    });
  };

  const reconcileTask = (value: ProjectTaskDto, optimisticId?: string) => {
    const nextTask = toTaskView(value, account);
    const targetId = optimisticId ?? nextTask.id;
    const hasTarget = snapshot.tasks.some((item) => item.id === targetId);
    const hasRemote = snapshot.tasks.some((item) => item.id === nextTask.id);
    const tasks = hasTarget
      ? snapshot.tasks.map((item) => (item.id === targetId ? nextTask : item))
      : optimisticId && !hasRemote
        ? [...snapshot.tasks, nextTask]
        : snapshot.tasks;
    publish({ ...snapshot, tasks });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async hydrate() {
      if (hydrated) return;
      try {
        const remote = await client.studio.snapshot.get({});
        defaultWorkspaceId ??= remote.account.workspaceIds[0];
        const next = await snapshotFromDto(client, remote);
        snapshot = next;
        account = remote.account;
        remote.projects.forEach((project) =>
          projectWorkspaceIds.set(project.id, project.workspaceId),
        );
        next.sessions.forEach((session) => remoteSessionIds.add(session.id));
        hydrated = true;
        persistenceWarning = false;
        notify();
      } catch (error) {
        fail();
        throw error;
      }
    },
    getHome: () => homeView(snapshot),
    getProjectAssets(projectId) {
      const assets = snapshot.assets ?? [];
      const versions = snapshot.versions ?? [];
      return (snapshot.assetReferences ?? [])
        .filter((reference) => reference.projectId === projectId)
        .flatMap((reference) => {
          const asset = assets.find((item) => item.id === reference.assetId);
          if (!asset) return [];
          return [
            {
              reference,
              asset,
              versions: versions.filter((version) => version.assetId === asset.id),
            },
          ];
        });
    },
    async searchLibrary(query): Promise<LibrarySearchView> {
      const result = await client.library.search({
        limit: 100,
        ...(query.trim() ? { query: query.trim() } : {}),
      });
      return {
        assets: result.assets.map(toAssetView),
        versions: result.versions.map(toVersionView),
        projects: result.projects.map(toProjectView),
        nextCursor: result.nextCursor,
      };
    },
    createProject(name) {
      const workspaceId = defaultWorkspaceId;
      if (!workspaceId) throw new LocalizedWebError("PROJECT_WORKSPACE_UNAVAILABLE");
      const value: ProjectView = {
        id: id(),
        name: name.trim().slice(0, 120),
        description: "",
        status: "active",
        milestone: "",
        updatedAt: new Date(),
      };
      if (!value.name) throw new LocalizedWebError("PROJECT_NAME_REQUIRED");
      publish({ ...snapshot, projects: [...snapshot.projects, value] });
      void client.projects
        .create({
          workspaceId,
          title: value.name,
          description: value.description,
          deadline: null,
          idempotencyKey: id(),
        })
        .then((created) => reconcileProject(created, value.id))
        .catch(() => {
          publish({
            ...snapshot,
            projects: snapshot.projects.filter((item) => item.id !== value.id),
          });
          fail();
        });
      return value;
    },
    updateProject(value) {
      const previous = project(value.id);
      if (!previous) throw new LocalizedWebError("PROJECT_NOT_FOUND");
      publish({
        ...snapshot,
        projects: snapshot.projects.map((item) => (item.id === value.id ? value : item)),
      });
      void client.projects
        .update({
          projectId: value.id,
          title: value.name,
          description: value.description,
          stage: projectStage(value),
        })
        .then(reconcileProject)
        .catch(() => {
          publish({
            ...snapshot,
            projects: snapshot.projects.map((item) => (item.id === value.id ? previous : item)),
          });
          fail();
        });
    },
    createTask(projectId, title) {
      if (!project(projectId)) throw new LocalizedWebError("PROJECT_NOT_FOUND");
      const value: TaskView = {
        id: id(),
        projectId,
        title: title.trim().slice(0, 300),
        status: "todo",
        ...(account ? { owner: account.displayName, ownerKey: "you" as const } : { owner: "" }),
        priority: "normal",
      };
      if (!value.title) throw new LocalizedWebError("TASK_TITLE_REQUIRED");
      publish({ ...snapshot, tasks: [...snapshot.tasks, value] });
      void client.projects.tasks
        .create({ projectId, title: value.title, idempotencyKey: id() })
        .then((remote) => reconcileTask(remote, value.id))
        .catch(() => {
          publish({ ...snapshot, tasks: snapshot.tasks.filter((item) => item.id !== value.id) });
          fail();
        });
      return value;
    },
    updateTask(value) {
      const previous = snapshot.tasks.find((item) => item.id === value.id);
      if (!previous) throw new LocalizedWebError("TASK_NOT_FOUND");
      publish({
        ...snapshot,
        tasks: snapshot.tasks.map((item) => (item.id === value.id ? value : item)),
      });
      void client.projects.tasks
        .update({ taskId: value.id, title: value.title, status: value.status })
        .then((remote) => {
          const next = toTaskView(remote, account);
          publish({
            ...snapshot,
            tasks: snapshot.tasks.map((item) => (item.id === value.id ? next : item)),
          });
        })
        .catch(() => {
          publish({
            ...snapshot,
            tasks: snapshot.tasks.map((item) => (item.id === value.id ? previous : item)),
          });
          fail();
        });
    },
    async uploadAsset(projectId, file) {
      const workspaceId = projectWorkspaceIds.get(projectId);
      if (!workspaceId) throw new LocalizedWebError("PROJECT_WORKSPACE_UNAVAILABLE");
      // Leave room for base64 and RPC metadata inside the current 1 MiB request limit.
      if (file.size > 512 * 1024)
        throw new LocalizedWebError("ASSET_TOO_LARGE", { maxBytes: 512 * 1024 });
      const attempts = uploads.get(file) ?? new Map<string, AssetUploadAttempt>();
      uploads.set(file, attempts);
      let attempt = attempts.get(projectId);
      if (!attempt) {
        const asset =
          (snapshot.assets ?? []).find(
            (item) =>
              item.workspaceId === workspaceId &&
              item.path === file.name &&
              item.status === "active",
          ) ?? (await client.workspace.assets.create({ workspaceId, path: file.name }));
        attempt = { asset, idempotencyKey: id() };
        attempts.set(projectId, attempt);
        publish({
          ...snapshot,
          assets: [...(snapshot.assets ?? []).filter((item) => item.id !== asset.id), asset],
        });
      }
      if (!attempt.committed) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const blobHash = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
        const contentType = file.type || "application/octet-stream";
        const upload = await client.workspace.assets.upload.create({
          workspaceId,
          byteSize: file.size,
          contentType,
          expectedHash: blobHash,
        });
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 0x8000)
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        await client.workspace.assets.upload.complete({
          uploadId: upload.id,
          byteSize: file.size,
          contentType,
          blobHash,
          body: btoa(binary),
        });
        attempt.committed = await client.workspace.assets.commitVersion({
          workspaceId,
          assetId: attempt.asset.id,
          blobHash,
          byteSize: file.size,
          contentType,
          expectedHeadVersionId: attempt.asset.headVersionId,
          parentVersionId: attempt.asset.headVersionId,
          idempotencyKey: attempt.idempotencyKey,
        });
      }
      const { asset, version } = attempt.committed;
      publish({
        ...snapshot,
        assets: [...(snapshot.assets ?? []).filter((item) => item.id !== asset.id), asset],
        versions: [...(snapshot.versions ?? []).filter((item) => item.id !== version.id), version],
      });
      return attachAsset(projectId, asset.id);
    },
    attachAsset,
    removeTask() {
      throw new LocalizedWebError("TASK_DELETE_UNAVAILABLE");
    },
    createSession(projectId, prompt) {
      const session: PiSessionView = {
        id: id(),
        projectId,
        prompt,
        status: "idle",
        steps: [],
        taskId: null,
      };
      publish({ ...snapshot, sessions: [...snapshot.sessions, session] });
      return session;
    },
    async startSession(session) {
      const prompt = session.prompt.trim();
      if (!prompt) throw new LocalizedWebError("PROMPT_REQUIRED");
      try {
        const remote = await client.pi.sessions.create({
          projectId: session.projectId,
          prompt,
          context: {},
          idempotencyKey: id(),
        });
        const next = toSessionView(remote);
        remoteSessionIds.add(next.id);
        publish({
          ...snapshot,
          sessions: snapshot.sessions.map((item) => (item.id === session.id ? next : item)),
        });
        return next;
      } catch (error) {
        publish({
          ...snapshot,
          sessions: snapshot.sessions.map((item) =>
            item.id === session.id ? { ...item, status: "failed" } : item,
          ),
        });
        fail();
        throw error;
      }
    },
    updateSession(session) {
      publish({
        ...snapshot,
        sessions: snapshot.sessions.map((item) => (item.id === session.id ? session : item)),
      });
      if (session.status === "cancelled" && remoteSessionIds.has(session.id)) {
        void client.pi.sessions.cancel({ sessionId: session.id }).catch(fail);
      }
    },
    getPersistenceWarning: () => persistenceWarning,
  };
}
