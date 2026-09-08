import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in_progress", "blocked", "done"]);
export const projectViewSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000),
  status: z.enum(["active", "paused", "completed", "archived"]),
  milestone: z.string(),
  updatedAt: z.coerce.date(),
});
export const taskViewSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().min(1).max(300),
  status: taskStatusSchema,
  owner: z.string(),
  priority: z.enum(["normal", "high"]),
});
export const activityViewSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  action: z.enum(["created", "updated", "completed", "cancelled", "failed", "restored"]),
  at: z.coerce.date(),
});
export const runStepSchema = z.enum(["understand", "context", "create"]);
export const piSessionViewSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  prompt: z.string(),
  status: z.enum(["idle", "running", "completed", "cancelled", "failed"]),
  steps: z.array(runStepSchema),
  taskId: z.string().nullable(),
});
export const studioSnapshotSchema = z.object({
  version: z.literal(1),
  projects: z.array(projectViewSchema),
  tasks: z.array(taskViewSchema),
  activity: z.array(activityViewSchema),
  sessions: z.array(piSessionViewSchema),
});
export type ProjectView = z.infer<typeof projectViewSchema>;
export type TaskView = z.infer<typeof taskViewSchema>;
export type ActivityView = z.infer<typeof activityViewSchema>;
export type PiSessionView = z.infer<typeof piSessionViewSchema>;
export type StudioSnapshot = z.infer<typeof studioSnapshotSchema>;
export type ProjectTab = "overview" | "tasks" | "pi" | "activity" | "settings";
export type TaskFilter = "all" | TaskView["status"];
export interface HomeViewModel {
  projects: Array<ProjectView & { blocked: number; complete: number; total: number }>;
  attention: TaskView[];
  activity: ActivityView[];
}

export function projectSearch(search: Record<string, unknown>): {
  tab: ProjectTab;
  filter: TaskFilter;
} {
  const tabs: string[] = ["overview", "tasks", "pi", "activity", "settings"];
  const filters: string[] = ["all", "todo", "in_progress", "blocked", "done"];
  return {
    tab:
      typeof search.tab === "string" && tabs.includes(search.tab)
        ? (search.tab as ProjectTab)
        : "overview",
    filter:
      typeof search.filter === "string" && filters.includes(search.filter)
        ? (search.filter as TaskFilter)
        : "all",
  };
}
