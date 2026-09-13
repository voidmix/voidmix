import {
  createAuthSettingsAdministration,
  createMailSettingsAdministration,
  createPublicAuthCapabilities,
  createUserAdministration,
  createAssetAdministration,
  createAgentAdministration,
  type AgentRepositories,
  type AssetRepositories,
  type AuthSettings,
  type MailSettingsFallback,
  type SystemSettingsRepository,
  type UserRepository,
  createWorkspaceAccessAdministration,
  type BlobStorageRepository,
  type ProjectRepository,
  type WorkspaceMembershipRepository,
  type ProjectStudioRepositories,
  type ScheduledTaskRepository,
} from "@voidmix/core";
import type { Locale } from "@voidmix/i18n/types";
import type { AiProvider } from "@voidmix/ai";
import type {
  ActivityDto,
  AssetReferenceDto,
  AssetVersionReferenceDto,
  FeedbackDto,
  LibrarySearchResultDto,
  PiSessionDetailDto,
  ProjectDetailDto,
  ProjectStage,
  ProjectSummaryDto,
  ProjectTaskDto,
  ProjectMemberDto,
  ReviewDto,
  StudioSnapshotDto,
} from "@voidmix/contracts";
import type { Mailer } from "@voidmix/mail/types";
import type { ProjectApplication } from "@voidmix/application";

import { createProjectStudioService } from "./project-studio.js";

interface CursorPage<Item> {
  items: Item[];
  nextCursor: string | null;
}

interface ActorInput {
  actorId: string;
}

/** API-owned port for the account-scoped Project Studio contract tree. */
export interface ProjectStudioService {
  getSnapshot(input: ActorInput): Promise<StudioSnapshotDto>;
  listProjects(
    input: ActorInput & {
      stage?: ProjectStage;
      archived?: boolean;
      limit: number;
      cursor?: string;
    },
  ): Promise<CursorPage<ProjectSummaryDto>>;
  getProject(input: ActorInput & { projectId: string }): Promise<ProjectDetailDto | null>;
  createProject(
    input: ActorInput & {
      workspaceId?: string;
      title: string;
      description?: string | null;
      deadline?: Date | null;
      idempotencyKey: string;
    },
  ): Promise<ProjectDetailDto>;
  updateProject(
    input: ActorInput & {
      projectId: string;
      title?: string;
      description?: string | null;
      cover?: string | null;
      thumbnail?: string | null;
      deadline?: Date | null;
      stage?: ProjectStage;
    },
  ): Promise<ProjectDetailDto>;
  archiveProject(input: ActorInput & { projectId: string }): Promise<ProjectSummaryDto>;
  restoreProject(input: ActorInput & { projectId: string }): Promise<ProjectSummaryDto>;
  addProjectMember(
    input: ActorInput & { projectId: string; userId: string; role: ProjectMemberDto["role"] },
  ): Promise<ProjectMemberDto>;
  updateProjectMember(
    input: ActorInput & { projectId: string; userId: string; role: ProjectMemberDto["role"] },
  ): Promise<ProjectMemberDto>;
  removeProjectMember(
    input: ActorInput & { projectId: string; userId: string },
  ): Promise<ProjectMemberDto>;
  listProjectAssets(
    input: ActorInput & { projectId: string; limit: number; cursor?: string },
  ): Promise<CursorPage<AssetReferenceDto>>;
  createProjectAsset(
    input: ActorInput & {
      projectId: string;
      assetId: string;
      versionId?: string | null;
      label?: string | null;
    },
  ): Promise<AssetReferenceDto>;
  listProjectTasks(
    input: ActorInput & {
      projectId: string;
      status?: ProjectTaskDto["status"];
      limit: number;
      cursor?: string;
    },
  ): Promise<CursorPage<ProjectTaskDto>>;
  getProjectTask(input: ActorInput & { taskId: string }): Promise<ProjectTaskDto | null>;
  createProjectTask(
    input: ActorInput & { projectId: string; title: string; idempotencyKey: string },
  ): Promise<ProjectTaskDto>;
  updateProjectTask(
    input: ActorInput & {
      taskId: string;
      title?: string;
      status?: ProjectTaskDto["status"];
    },
  ): Promise<ProjectTaskDto>;
  searchLibrary(
    input: ActorInput & {
      query?: string;
      projectId?: string;
      limit: number;
      cursor?: string;
    },
  ): Promise<LibrarySearchResultDto>;
  getAssetWorkspace(input: ActorInput & { assetId: string }): Promise<string | null>;
  listAssetVersions(
    input: ActorInput & { assetId: string; limit: number; cursor?: string },
  ): Promise<CursorPage<AssetVersionReferenceDto>>;
  listReviews(
    input: ActorInput & {
      projectId: string;
      status?: ReviewDto["status"];
      limit: number;
      cursor?: string;
    },
  ): Promise<CursorPage<ReviewDto>>;
  getReview(input: ActorInput & { reviewId: string }): Promise<ReviewDto | null>;
  createReview(
    input: ActorInput & {
      projectId: string;
      targetVersionId: string | null;
      title: string;
      idempotencyKey: string;
    },
  ): Promise<ReviewDto>;
  updateReview(
    input: ActorInput & { reviewId: string; status: ReviewDto["status"] },
  ): Promise<ReviewDto>;
  resolveReview(input: ActorInput & { reviewId: string }): Promise<ReviewDto>;
  listFeedback(
    input: ActorInput & {
      reviewId: string;
      status?: FeedbackDto["status"];
      limit: number;
      cursor?: string;
    },
  ): Promise<CursorPage<FeedbackDto>>;
  getFeedback(input: ActorInput & { feedbackId: string }): Promise<FeedbackDto | null>;
  createFeedback(
    input: ActorInput & {
      reviewId: string;
      targetVersionId: string;
      body: string;
      idempotencyKey: string;
    },
  ): Promise<FeedbackDto>;
  updateFeedback(
    input: ActorInput & { feedbackId: string; status: FeedbackDto["status"] },
  ): Promise<FeedbackDto>;
  listActivity(
    input: ActorInput & { projectId?: string; limit: number; cursor?: string },
  ): Promise<CursorPage<ActivityDto>>;
  createPiSession(
    input: ActorInput & {
      projectId: string;
      prompt: string;
      context: Record<string, unknown>;
      idempotencyKey: string;
    },
  ): Promise<PiSessionDetailDto>;
  getPiSession(input: ActorInput & { sessionId: string }): Promise<PiSessionDetailDto | null>;
  cancelPiSession(input: ActorInput & { sessionId: string }): Promise<PiSessionDetailDto>;
  updatePiSession(
    input: ActorInput & { sessionId: string; parameters: Record<string, unknown> },
  ): Promise<PiSessionDetailDto>;
  pausePiSession(input: ActorInput & { sessionId: string }): Promise<PiSessionDetailDto>;
  resumePiSession(input: ActorInput & { sessionId: string }): Promise<PiSessionDetailDto>;
  retryPiSession(
    input: ActorInput & { sessionId: string; idempotencyKey: string },
  ): Promise<PiSessionDetailDto>;
}

export interface CreateApiModulesOptions {
  /** V2 account-first Project application. */
  v2Projects?: ProjectApplication;
  users: UserRepository;
  settings: SystemSettingsRepository;
  mailFallback: MailSettingsFallback;
  mailer: Mailer;
  now?: () => Date;
  id?: () => string;
  resolveAuthSettings?: () => Promise<AuthSettings>;
  /** Optional until the host wires persistent asset repositories. */
  assets?: AssetRepositories;
  /** Optional until the host wires persistent agent repositories. */
  agents?: AgentRepositories;
  /** Workspace membership is an independent authorization seam. */
  workspaceMemberships?: WorkspaceMembershipRepository;
  /** Project and task persistence used by the first live Studio slice. */
  projects?: ProjectRepository;
  /** Optional until Project Studio persistence and application services are wired. */
  studio?: ProjectStudioService;
  /** Object storage stays outside the Project Studio snapshot and is optional until a provider is selected. */
  blobStorage?: BlobStorageRepository;
  projectStudioRepositories?: ProjectStudioRepositories;
  /** Optional Pi provider; when present, sessions execute asynchronously on creation. */
  aiProvider?: AiProvider;
  scheduledTasks?: ScheduledTaskRepository;
}

export interface ApiModules {
  v2Projects?: ProjectApplication;
  users: ReturnType<typeof createUserAdministration>;
  settings: {
    auth: ReturnType<typeof createAuthSettingsAdministration>;
    mail: ReturnType<typeof createMailSettingsAdministration>;
  };
  publicAuthCapabilities: ReturnType<typeof createPublicAuthCapabilities>;
  assets?: ReturnType<typeof createAssetAdministration>;
  agents?: ReturnType<typeof createAgentAdministration>;
  workspaceAccess?: ReturnType<typeof createWorkspaceAccessAdministration>;
  /** Optional until Project Studio persistence and application services are wired. */
  studio?: ProjectStudioService;
  blobStorage?: BlobStorageRepository;
  projectStudioRepositories?: ProjectStudioRepositories;
  aiProvider?: AiProvider;
  scheduled?: ScheduledTaskRepository;
}

export function createApiModules(options: CreateApiModulesOptions): ApiModules {
  const studio =
    options.studio ??
    (options.projects
      ? createProjectStudioService({
          projects: options.projects,
          users: options.users,
          ...(options.workspaceMemberships ? { memberships: options.workspaceMemberships } : {}),
          ...(options.projectStudioRepositories
            ? { repositories: options.projectStudioRepositories }
            : {}),
          ...(options.assets ? { assets: options.assets } : {}),
          ...(options.agents ? { agents: options.agents } : {}),
          ...(options.now ? { now: options.now } : {}),
          ...(options.id ? { id: options.id } : {}),
          ...(options.aiProvider ? { aiProvider: options.aiProvider } : {}),
        })
      : undefined);
  return {
    ...(options.v2Projects ? { v2Projects: options.v2Projects } : {}),
    users: createUserAdministration({
      users: options.users,
      ...(options.now ? { now: options.now } : {}),
      ...(options.id ? { id: options.id } : {}),
    }),
    settings: {
      auth: createAuthSettingsAdministration({
        settings: options.settings,
        ...(options.now ? { now: options.now } : {}),
        ...(options.id ? { id: options.id } : {}),
      }),
      mail: createMailSettingsAdministration({
        settings: options.settings,
        fallback: options.mailFallback,
        sendTest: (input) =>
          options.mailer.sendTest({
            email: input.email,
            name: input.name,
            ...(input.locale ? { locale: input.locale as Locale } : {}),
          }),
        ...(options.now ? { now: options.now } : {}),
        ...(options.id ? { id: options.id } : {}),
      }),
    },
    publicAuthCapabilities: createPublicAuthCapabilities({
      settings: options.settings,
      mailFallback: options.mailFallback,
      ...(options.resolveAuthSettings ? { resolveAuthSettings: options.resolveAuthSettings } : {}),
    }),
    ...(options.assets
      ? {
          assets: createAssetAdministration({
            repositories: options.assets,
            ...(options.now ? { now: options.now } : {}),
            ...(options.id ? { id: options.id } : {}),
          }),
        }
      : {}),
    ...(options.agents
      ? {
          agents: createAgentAdministration({
            repositories: options.agents,
            ...(options.now ? { now: options.now } : {}),
            ...(options.id ? { id: options.id } : {}),
          }),
        }
      : {}),
    ...(options.workspaceMemberships
      ? {
          workspaceAccess: createWorkspaceAccessAdministration({
            memberships: options.workspaceMemberships,
          }),
        }
      : {}),
    ...(studio ? { studio } : {}),
    ...(options.blobStorage ? { blobStorage: options.blobStorage } : {}),
    ...(options.scheduledTasks ? { scheduled: options.scheduledTasks } : {}),
  };
}
