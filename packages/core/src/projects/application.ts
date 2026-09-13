import {
  projectStatusFromLifecycle,
  ProjectDomainError,
  transitionProjectLifecycle,
  type ProjectRepository,
  type ProjectStage,
  type ProjectStatus,
  type ProjectTaskStatus,
} from "./model.js";
import { defaultClock } from "../shared/types.js";

export function createProjectAdministration(options: {
  projects: ProjectRepository;
  /** Reserved for parity with other application factories. */
  now?: () => Date;
  /** Reserved for parity with other application factories. */
  id?: () => string;
}) {
  const { projects } = options;
  const now = options.now ?? defaultClock.now;
  return {
    list: (ownerId: string) => projects.list(ownerId),
    get: (id: string) => projects.getById(id),
    create: (input: {
      ownerId: string;
      name: string;
      description?: string;
      workspaceId?: string;
      deadline?: Date | null;
      cover?: string | null;
      thumbnail?: string | null;
    }) => projects.create(input),
    update: async (input: {
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
    }) => {
      const lifecycleFields =
        input.stage !== undefined ||
        input.archived !== undefined ||
        input.archivedAt !== undefined ||
        input.previousStage !== undefined ||
        input.status !== undefined;

      if (!lifecycleFields) return projects.update(input);

      const current = await projects.getById(input.id);
      if (!current) {
        throw new ProjectDomainError("PROJECT_NOT_FOUND", `Project ${input.id} was not found.`);
      }

      const legacyLifecycle =
        input.status === undefined
          ? {}
          : input.status === "archived"
            ? { archived: true }
            : {
                archived: false,
                stage:
                  input.status === "completed" ? ("delivered" as const) : ("in_progress" as const),
              };
      const lifecycle = transitionProjectLifecycle(
        current,
        {
          ...legacyLifecycle,
          ...(input.stage !== undefined ? { stage: input.stage } : {}),
          ...(input.archived !== undefined ? { archived: input.archived } : {}),
          ...(input.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
          ...(input.previousStage !== undefined ? { previousStage: input.previousStage } : {}),
        },
        now,
      );

      return projects.update({
        ...input,
        stage: lifecycle.stage,
        archived: lifecycle.archived,
        archivedAt: lifecycle.archivedAt,
        previousStage: lifecycle.previousStage,
        status: input.status ?? projectStatusFromLifecycle(lifecycle),
      });
    },
    tasks: (projectId: string) => projects.listTasks(projectId),
    createTask: (input: { projectId: string; actorId: string; title: string }) =>
      projects.createTask(input),
    updateTask: (input: {
      taskId: string;
      actorId: string;
      status?: ProjectTaskStatus;
      title?: string;
    }) => projects.updateTask(input),
  };
}
