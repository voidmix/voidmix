import type { WebTranslator } from "../../i18n/client";
import {
  previewOwnerKeySchema,
  previewProjectDescriptionKeySchema,
  previewProjectMilestoneKeySchema,
  previewProjectTitleKeySchema,
  previewTaskTitleKeySchema,
} from "./types";
import type { ActivityView, ProjectView, TaskView } from "./types";

type WorkspaceTranslator = WebTranslator<"workspaceUi">;

function isRestoredKey(
  previousKey: string | undefined,
  nextKey: unknown,
  isValid: (value: unknown) => boolean,
): boolean {
  return previousKey === undefined && nextKey !== undefined && isValid(nextKey);
}

export function displayProjectName(
  project: Pick<ProjectView, "name" | "titleKey">,
  t: WorkspaceTranslator,
): string {
  return project.titleKey ? t(project.titleKey) : project.name;
}

export function displayProjectDescription(
  project: Pick<ProjectView, "description" | "descriptionKey">,
  t: WorkspaceTranslator,
): string {
  return project.descriptionKey ? t(project.descriptionKey) : project.description;
}

export function displayProjectMilestone(
  project: Pick<ProjectView, "milestone" | "milestoneKey">,
  t: WorkspaceTranslator,
): string {
  return project.milestoneKey ? t(project.milestoneKey) : project.milestone;
}

export function displayTaskTitle(
  task: Pick<TaskView, "title" | "titleKey">,
  t: WorkspaceTranslator,
): string {
  return task.titleKey ? t(task.titleKey) : task.title;
}

export function displayTaskOwner(
  task: Pick<TaskView, "owner" | "ownerKey">,
  t: WorkspaceTranslator,
): string {
  return task.ownerKey ? t(task.ownerKey) : task.owner;
}

export function displayActivityTitle(
  item: Pick<ActivityView, "title" | "titleKey">,
  t: WorkspaceTranslator,
): string {
  return item.titleKey ? t(item.titleKey) : item.title;
}

/** Remove preview-only metadata before a record is edited or persisted. */
export function withoutProjectPreviewCopy(project: ProjectView): ProjectView {
  const next = { ...project };
  delete next.titleKey;
  delete next.descriptionKey;
  delete next.milestoneKey;
  return next;
}

/** Preserve untouched preview fields while dropping metadata for edited copy. */
export function withoutChangedProjectPreviewCopy(
  previous: ProjectView,
  next: ProjectView,
): ProjectView {
  const value = { ...next };
  if (
    next.name !== previous.name &&
    !isRestoredKey(
      previous.titleKey,
      next.titleKey,
      (key) => previewProjectTitleKeySchema.safeParse(key).success,
    )
  )
    delete value.titleKey;
  if (
    next.description !== previous.description &&
    !isRestoredKey(
      previous.descriptionKey,
      next.descriptionKey,
      (key) => previewProjectDescriptionKeySchema.safeParse(key).success,
    )
  )
    delete value.descriptionKey;
  if (
    next.milestone !== previous.milestone &&
    !isRestoredKey(
      previous.milestoneKey,
      next.milestoneKey,
      (key) => previewProjectMilestoneKeySchema.safeParse(key).success,
    )
  )
    delete value.milestoneKey;
  return value;
}

/** Remove preview-only metadata before a task is edited or persisted. */
export function withoutTaskPreviewCopy(task: TaskView): TaskView {
  const next = { ...task };
  delete next.titleKey;
  delete next.ownerKey;
  return next;
}

/** Preserve untouched preview fields while dropping metadata for edited copy. */
export function withoutChangedTaskPreviewCopy(previous: TaskView, next: TaskView): TaskView {
  const value = { ...next };
  if (
    next.title !== previous.title &&
    !isRestoredKey(
      previous.titleKey,
      next.titleKey,
      (key) => previewTaskTitleKeySchema.safeParse(key).success,
    )
  )
    delete value.titleKey;
  if (
    next.owner !== previous.owner &&
    !isRestoredKey(
      previous.ownerKey,
      next.ownerKey,
      (key) => previewOwnerKeySchema.safeParse(key).success,
    )
  )
    delete value.ownerKey;
  return value;
}
