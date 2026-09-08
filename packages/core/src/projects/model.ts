import { DomainError } from "../shared/errors.js";
import { defaultClock } from "../shared/types.js";

/** Legacy project values retained at the repository boundary during migration. */
export const projectStatuses = ["active", "paused", "completed", "archived"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const projectStages = ["draft", "in_progress", "review", "delivered"] as const;
export type ProjectStage = (typeof projectStages)[number];

export type ProjectDomainErrorCode =
  | "PROJECT_NOT_FOUND"
  | "PROJECT_INVALID_STAGE_TRANSITION"
  | "PROJECT_INVALID_LIFECYCLE_UPDATE";

export class ProjectDomainError extends DomainError<ProjectDomainErrorCode> {
  constructor(code: ProjectDomainErrorCode, message: string) {
    super(code, message);
    this.name = "ProjectDomainError";
  }
}

export const projectTaskStatuses = ["todo", "in_progress", "blocked", "done"] as const;
export type ProjectTaskStatus = (typeof projectTaskStatuses)[number];

export interface Project {
  id: string;
  name: string;
  description: string;
  /** @deprecated Use stage and archived for Project Studio lifecycle decisions. */
  status: ProjectStatus;
  ownerId: string;
  /** Workspace tenancy is required for the live Project Studio projection. */
  workspaceId?: string;
  deadline?: Date | null;
  cover?: string | null;
  thumbnail?: string | null;
  /** Optional while legacy repositories and clients are being migrated. */
  stage?: ProjectStage;
  /** Archive is independent from the creative stage. */
  archived?: boolean;
  archivedAt?: Date | null;
  /** The stage to restore after an archive operation. */
  previousStage?: ProjectStage | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectLifecycle {
  stage: ProjectStage;
  archived: boolean;
  archivedAt: Date | null;
  previousStage: ProjectStage | null;
}

export type ProjectProgress = number | null;

/** The only forward path is draft -> in_progress -> review -> delivered. */
const projectStageTransitions: Record<ProjectStage, readonly ProjectStage[]> = {
  draft: ["draft", "in_progress"],
  in_progress: ["in_progress", "review"],
  review: ["review", "delivered", "in_progress"],
  delivered: ["delivered", "in_progress"],
};

export function projectStageFromStatus(status: ProjectStatus): ProjectStage {
  switch (status) {
    case "completed":
      return "delivered";
    case "active":
    case "paused":
    case "archived":
      return status === "archived" ? "draft" : "in_progress";
  }
}

export function projectStatusFromLifecycle(lifecycle: ProjectLifecycle): ProjectStatus {
  if (lifecycle.archived) return "archived";
  return lifecycle.stage === "delivered" ? "completed" : "active";
}

/** Resolves a legacy project into the canonical lifecycle projection. */
export function projectLifecycle(project: Project): ProjectLifecycle {
  const stage = project.stage ?? projectStageFromStatus(project.status);
  const archived = project.archived ?? project.status === "archived";

  return {
    stage,
    archived,
    archivedAt: project.archivedAt ?? null,
    previousStage: project.previousStage ?? null,
  };
}

export function canTransitionProjectStage(from: ProjectStage, to: ProjectStage): boolean {
  return projectStageTransitions[from].includes(to);
}

export function assertProjectStageTransition(from: ProjectStage, to: ProjectStage): void {
  if (!canTransitionProjectStage(from, to)) {
    throw new ProjectDomainError(
      "PROJECT_INVALID_STAGE_TRANSITION",
      `Project stage cannot change from ${from} to ${to}.`,
    );
  }
}

export function projectProgress(tasks: readonly ProjectTask[]): ProjectProgress {
  if (tasks.length === 0) return null;
  return tasks.filter((task) => task.status === "done").length / tasks.length;
}

export function transitionProjectLifecycle(
  project: Project,
  input: {
    stage?: ProjectStage;
    archived?: boolean;
    archivedAt?: Date | null;
    previousStage?: ProjectStage | null;
  },
  now: () => Date = defaultClock.now,
): ProjectLifecycle {
  const current = projectLifecycle(project);

  if (current.archived && input.stage !== undefined && input.stage !== current.stage) {
    throw new ProjectDomainError(
      "PROJECT_INVALID_LIFECYCLE_UPDATE",
      "An archived project must be restored before changing its stage.",
    );
  }

  if (current.archived) {
    if (input.archived === false) {
      return {
        stage: input.previousStage ?? current.previousStage ?? current.stage,
        archived: false,
        archivedAt: null,
        previousStage: null,
      };
    }

    return {
      ...current,
      ...(input.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
      ...(input.previousStage !== undefined ? { previousStage: input.previousStage } : {}),
    };
  }

  const stage = input.stage ?? current.stage;
  if (input.stage !== undefined) assertProjectStageTransition(current.stage, input.stage);

  if (input.archived === true) {
    return {
      stage,
      archived: true,
      archivedAt: input.archivedAt ?? now(),
      previousStage: stage,
    };
  }

  return {
    stage,
    archived: false,
    archivedAt: null,
    previousStage: null,
  };
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  status: ProjectTaskStatus;
  createdBy: string;
  updatedAt: Date;
}

export interface ProjectRepository {
  list(ownerId: string): Promise<Project[]>;
  /** Lists all projects in a workspace for account-scoped projections. */
  listByWorkspace?(workspaceId: string): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(input: {
    ownerId: string;
    name: string;
    description?: string;
    workspaceId?: string;
    deadline?: Date | null;
    cover?: string | null;
    thumbnail?: string | null;
  }): Promise<Project>;
  update(input: {
    id: string;
    actorId: string;
    name?: string;
    description?: string;
    status?: ProjectStatus;
    stage?: ProjectStage;
    archived?: boolean;
    archivedAt?: Date | null;
    previousStage?: ProjectStage | null;
    deadline?: Date | null;
    cover?: string | null;
    thumbnail?: string | null;
  }): Promise<Project>;
  listTasks(projectId: string): Promise<ProjectTask[]>;
  createTask(input: { projectId: string; actorId: string; title: string }): Promise<ProjectTask>;
  updateTask(input: {
    taskId: string;
    actorId: string;
    status?: ProjectTaskStatus;
    title?: string;
  }): Promise<ProjectTask>;
}
