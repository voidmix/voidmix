import type { ProjectRepository, ProjectStatus, ProjectTaskStatus } from "./model.js";

export function createProjectAdministration(options: {
  projects: ProjectRepository;
  /** Reserved for parity with other application factories. */
  now?: () => Date;
  /** Reserved for parity with other application factories. */
  id?: () => string;
}) {
  const { projects } = options;
  return {
    list: (ownerId: string) => projects.list(ownerId),
    get: (id: string) => projects.getById(id),
    create: (input: { ownerId: string; name: string; description?: string }) =>
      projects.create(input),
    update: (input: {
      id: string;
      actorId: string;
      name?: string;
      description?: string;
      status?: ProjectStatus;
    }) => projects.update(input),
    tasks: (projectId: string) => projects.listTasks(projectId),
    createTask: (input: { projectId: string; actorId: string; title: string }) =>
      projects.createTask(input),
    updateTask: (input: { taskId: string; actorId: string; status: ProjectTaskStatus }) =>
      projects.updateTask(input),
  };
}
