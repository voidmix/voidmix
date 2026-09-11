import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in_progress", "blocked", "done"]);

// Preview records carry stable message keys alongside their English fallback
// values. Live and user-created records omit these fields and render verbatim.
export const previewProjectTitleKeySchema = z.enum([
  "previewNorthstarLaunchFilmTitle",
  "previewBrandCampaignTitle",
  "previewSoundDesignTitle",
]);
export const previewProjectDescriptionKeySchema = z.enum([
  "previewNorthstarLaunchFilmDescription",
  "previewBrandCampaignDescription",
  "previewSoundDesignDescription",
]);
export const previewProjectMilestoneKeySchema = z.enum([
  "previewFinalReviewMilestone",
  "previewCreativeBriefMilestone",
  "previewMixReviewMilestone",
]);
export const previewTaskTitleKeySchema = z.enum([
  "previewApproveFinalColorPass",
  "previewConsolidateFinalFeedback",
  "previewPrepareCampaignBrief",
  "previewReviewFirstSoundMix",
  "previewConfirmPictureLock",
]);
export const previewOwnerKeySchema = z.enum(["you"]);

export const projectViewSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  titleKey: previewProjectTitleKeySchema.optional(),
  description: z.string().max(2000),
  descriptionKey: previewProjectDescriptionKeySchema.optional(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  milestone: z.string(),
  milestoneKey: previewProjectMilestoneKeySchema.optional(),
  updatedAt: z.coerce.date(),
});
export const taskViewSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().min(1).max(300),
  titleKey: previewTaskTitleKeySchema.optional(),
  status: taskStatusSchema,
  owner: z.string(),
  ownerKey: previewOwnerKeySchema.optional(),
  priority: z.enum(["normal", "high"]),
});
export const activityViewSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  titleKey: previewProjectTitleKeySchema.or(previewTaskTitleKeySchema).optional(),
  action: z.enum(["created", "updated", "completed", "cancelled", "failed", "restored"]),
  at: z.coerce.date(),
});
export const runStepSchema = z.enum(["understand", "context", "create"]);
export const piSessionViewSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  prompt: z.string(),
  status: z.enum(["idle", "running", "paused", "completed", "cancelled", "failed"]),
  steps: z.array(runStepSchema),
  taskId: z.string().nullable(),
  events: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        payload: z.record(z.string(), z.unknown()),
        createdAt: z.coerce.date(),
      }),
    )
    .optional(),
});
export interface StudioAsset {
  id: string;
  workspaceId: string;
  path: string;
  status: "active" | "deleted";
  headVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface StudioAssetVersion {
  id: string;
  assetId: string;
  workspaceId: string;
  blobHash: string;
  byteSize: number;
  contentType: string | null;
  createdBy: string;
  createdAt: Date;
  parentVersionId?: string | null;
}
export interface StudioAssetReference {
  id: string;
  projectId: string;
  assetId: string;
  versionId: string | null;
  workspaceId: string;
  label: string | null;
  createdAt: Date;
}
export interface ProjectAssetView {
  reference: StudioAssetReference;
  asset: StudioAsset;
  versions: StudioAssetVersion[];
}
export interface LibrarySearchView {
  assets: StudioAsset[];
  versions: StudioAssetVersion[];
  projects: ProjectView[];
  nextCursor: string | null;
}
export const studioSnapshotSchema = z.object({
  version: z.literal(1),
  projects: z.array(projectViewSchema),
  tasks: z.array(taskViewSchema),
  activity: z.array(activityViewSchema),
  sessions: z.array(piSessionViewSchema),
});
const previewProjectStageSchema = z.enum(["draft", "in_progress", "review", "delivered"]);
const previewProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120),
  titleKey: previewProjectTitleKeySchema.optional(),
  description: z.string().max(2000),
  descriptionKey: previewProjectDescriptionKeySchema.optional(),
  stage: previewProjectStageSchema,
  archived: z.boolean(),
  legacyStatus: z.enum(["active", "paused", "completed", "archived"]).nullable().default(null),
  stageWasDefaulted: z.boolean().default(false),
  cover: z.string().nullable().default(null),
  thumbnail: z.string().nullable().default(null),
  deadline: z.coerce.date().nullable().default(null),
  milestone: z.string().default(""),
  milestoneKey: previewProjectMilestoneKeySchema.optional(),
  updatedAt: z.coerce.date(),
});
export const studioPreviewDataSchema = z.object({
  projects: z.array(previewProjectSchema),
  tasks: z.array(taskViewSchema),
  activity: z.array(activityViewSchema),
  sessions: z.array(piSessionViewSchema),
  assets: z.array(z.unknown()).default([]),
  reviews: z.array(z.unknown()).default([]),
  projectMembers: z.array(z.unknown()).default([]),
});
export const studioPreviewEnvelopeSchema = z.object({
  version: z.literal(2),
  migratedFrom: z.literal(1).or(z.null()),
  data: studioPreviewDataSchema,
});
export type ProjectView = z.infer<typeof projectViewSchema>;
export type TaskView = z.infer<typeof taskViewSchema>;
export type ActivityView = z.infer<typeof activityViewSchema>;
export type PiSessionView = z.infer<typeof piSessionViewSchema>;
export type StudioSnapshot = z.infer<typeof studioSnapshotSchema> & {
  assets?: StudioAsset[];
  versions?: StudioAssetVersion[];
  assetReferences?: StudioAssetReference[];
};
export type StudioPreviewData = z.infer<typeof studioPreviewDataSchema>;
export type StudioPreviewEnvelope = z.infer<typeof studioPreviewEnvelopeSchema>;
export type ProjectTab =
  | "overview"
  | "brief"
  | "canvas"
  | "tasks"
  | "feedback"
  | "activity"
  | "settings"
  | "pi";
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
  const tabs: string[] = [
    "overview",
    "brief",
    "canvas",
    "tasks",
    "feedback",
    "activity",
    "settings",
    "pi",
  ];
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
