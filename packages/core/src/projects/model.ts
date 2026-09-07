export const projectStatuses = ["active", "paused", "completed", "archived"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const projectTaskStatuses = ["todo", "in_progress", "blocked", "done"] as const;
export type ProjectTaskStatus = (typeof projectTaskStatuses)[number];

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
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
  getById(id: string): Promise<Project | null>;
  create(input: { ownerId: string; name: string; description?: string }): Promise<Project>;
  update(input: {
    id: string;
    actorId: string;
    name?: string;
    description?: string;
    status?: ProjectStatus;
  }): Promise<Project>;
  listTasks(projectId: string): Promise<ProjectTask[]>;
  createTask(input: { projectId: string; actorId: string; title: string }): Promise<ProjectTask>;
  updateTask(input: {
    taskId: string;
    actorId: string;
    status: ProjectTaskStatus;
  }): Promise<ProjectTask>;
}
