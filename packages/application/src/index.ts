import {
  canProjectCapabilityV2,
  assertProjectScopeV2,
  ProjectV2DomainError,
  resolveProjectAccessV2,
  type ProjectAccessV2,
  type ProjectCapabilityV2,
  type ProjectScope,
  type ProjectV2,
  type ProjectV2Repository,
  type ProjectMemberV2Repository,
  type ProjectMemberRoleV2,
  type ProjectMemberV2,
  type ProjectStageV2,
  type OrganizationMemberV2Repository,
  type ProjectTaskV2Repository,
  type TaskStatusV2,
  type TaskV2,
  type FeedbackV2,
  type FeedbackV2Repository,
  type AssetV2,
  type AssetV2Repository,
  type AssetVersionV2,
  type AssetVersionV2Repository,
  type BlobStorageRepository,
  type ReviewStatusV2,
  type ReviewV2,
  type ReviewV2Repository,
} from "@voidmix/core";

export { createAgentRunApplication, type AgentRunApplication } from "./agent-v2.js";

export type {
  OrganizationMemberV2Repository,
  ProjectMemberV2Repository,
  ProjectV2Repository,
  ProjectTaskV2Repository,
  FeedbackV2Repository,
  ReviewV2Repository,
} from "@voidmix/core";

export interface ProjectApplication {
  get(input: {
    actorId: string;
    projectId: string;
  }): Promise<{ project: ProjectV2; access: ProjectAccessV2 } | null>;
  listForUser(userId: string): Promise<ProjectV2[]>;
  create(input: {
    actorId: string;
    scope: ProjectScope;
    title: string;
    description?: string | null;
  }): Promise<ProjectV2>;
  assertCapability(input: {
    actorId: string;
    projectId: string;
    capability: ProjectCapabilityV2;
  }): Promise<ProjectV2>;
  listTasks(input: { actorId: string; projectId: string }): Promise<TaskV2[]>;
  createTask(input: { actorId: string; projectId: string; title: string }): Promise<TaskV2>;
  updateTask(input: {
    actorId: string;
    taskId: string;
    title?: string;
    status?: TaskStatusV2;
  }): Promise<TaskV2>;
  listMembers(input: { actorId: string; projectId: string }): Promise<ProjectMemberV2[]>;
  addMember(input: {
    actorId: string;
    projectId: string;
    userId: string;
    role: ProjectMemberRoleV2;
  }): Promise<ProjectMemberV2>;
  updateMember(input: {
    actorId: string;
    projectId: string;
    userId: string;
    role: ProjectMemberRoleV2;
  }): Promise<ProjectMemberV2>;
  removeMember(input: {
    actorId: string;
    projectId: string;
    userId: string;
  }): Promise<ProjectMemberV2>;
  updateProject(input: {
    actorId: string;
    projectId: string;
    title?: string;
    description?: string | null;
    stage?: ProjectStageV2;
    deadline?: Date | null;
  }): Promise<ProjectV2>;
  archiveProject(input: { actorId: string; projectId: string }): Promise<ProjectV2>;
  restoreProject(input: { actorId: string; projectId: string }): Promise<ProjectV2>;
  deleteProject(input: { actorId: string; projectId: string }): Promise<void>;
  listReviews(input: { actorId: string; projectId: string }): Promise<ReviewV2[]>;
  createReview(input: {
    actorId: string;
    projectId: string;
    assetVersionId: string | null;
    title: string;
  }): Promise<ReviewV2>;
  updateReview(input: {
    actorId: string;
    reviewId: string;
    status: ReviewStatusV2;
  }): Promise<ReviewV2>;
  listFeedback(input: { actorId: string; reviewId: string }): Promise<FeedbackV2[]>;
  createFeedback(input: { actorId: string; reviewId: string; body: string }): Promise<FeedbackV2>;
  listAssets(input: { actorId: string; projectId: string }): Promise<AssetV2[]>;
  createAsset(input: { actorId: string; projectId: string; name: string }): Promise<AssetV2>;
  listAssetVersions(input: { actorId: string; assetId: string }): Promise<AssetVersionV2[]>;
  createAssetUpload(input: {
    actorId: string;
    projectId: string;
    byteSize: number;
    contentType: string;
    expectedHash: string;
  }): ReturnType<BlobStorageRepository["createUpload"]>;
  completeAssetUpload(input: {
    actorId: string;
    assetId: string;
    uploadId: string;
    byteSize: number;
    contentType: string;
    checksum: string;
    body?: Uint8Array;
  }): Promise<AssetVersionV2>;
}

export function createProjectApplication(options: {
  projects: ProjectV2Repository;
  tasks: ProjectTaskV2Repository;
  projectMembers: ProjectMemberV2Repository;
  organizationMembers: OrganizationMemberV2Repository;
  reviews: ReviewV2Repository;
  feedback: FeedbackV2Repository;
  assets: AssetV2Repository;
  assetVersions: AssetVersionV2Repository;
  blobStorage: BlobStorageRepository;
  now?: () => Date;
  id?: () => string;
}): ProjectApplication {
  const now = options.now ?? (() => new Date());
  const id = options.id ?? (() => `project-${now().getTime()}`);

  const accessFor = async (actorId: string, project: ProjectV2): Promise<ProjectAccessV2> => {
    const [projectMember, organizationMember] = await Promise.all([
      options.projectMembers.getByProjectAndUser({ projectId: project.id, userId: actorId }),
      project.organizationId
        ? options.organizationMembers.getByOrganizationAndUser({
            organizationId: project.organizationId,
            userId: actorId,
          })
        : Promise.resolve(null),
    ]);
    return resolveProjectAccessV2({
      actorId,
      project,
      ...(projectMember ? { projectMember } : {}),
      ...(organizationMember ? { organizationMember } : {}),
    });
  };

  return {
    async get({ actorId, projectId }) {
      const project = await options.projects.getById(projectId);
      if (!project) return null;
      const access = await accessFor(actorId, project);
      return access === "none" ? null : { project, access };
    },

    async listForUser(userId) {
      const personal = await options.projects.listByPersonalOwner(userId);
      const organizations = await options.organizationMembers.listByUser(userId);
      const organizationProjects = (
        await Promise.all(
          organizations
            .filter((membership) => membership.status === "active")
            .map((membership) => options.projects.listByOrganization(membership.organizationId)),
        )
      ).flat();
      const visible = new Map(
        [...personal, ...organizationProjects].map((project) => [project.id, project]),
      );
      return [...visible.values()].sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id),
      );
    },

    async create({ actorId, scope, title, description }) {
      assertProjectScopeV2(scope);
      if (!title.trim()) {
        throw new ProjectV2DomainError("PROJECT_SCOPE_INVALID", "Project title is required.");
      }
      if (scope.type === "personal" && scope.userId !== actorId) {
        throw new ProjectV2DomainError(
          "PROJECT_ACCESS_DENIED",
          "Personal project creation denied.",
        );
      }
      if (scope.type === "organization") {
        const membership = await options.organizationMembers.getByOrganizationAndUser({
          organizationId: scope.organizationId,
          userId: actorId,
        });
        if (!membership || membership.status !== "active" || membership.role === "viewer") {
          throw new ProjectV2DomainError(
            "PROJECT_ACCESS_DENIED",
            "Organization project creation denied.",
          );
        }
      }
      return options.projects.create({
        id: id(),
        createdByUserId: actorId,
        scope,
        title: title.trim(),
        ...(description !== undefined ? { description } : {}),
        now: now(),
      });
    },

    async assertCapability({ actorId, projectId, capability }) {
      const result = await this.get({ actorId, projectId });
      if (!result || !canProjectCapabilityV2(result.access, capability)) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project access denied.");
      }
      return result.project;
    },

    async listTasks({ actorId, projectId }) {
      const project = await options.projects.getById(projectId);
      if (!project) throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Task access denied.");
      const access = await accessFor(actorId, project);
      if (!canProjectCapabilityV2(access, "project.read")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Task access denied.");
      }
      return options.tasks.listByProject(projectId);
    },

    async createTask({ actorId, projectId, title }) {
      const project = await options.projects.getById(projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.write")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Task access denied.");
      }
      const trimmed = title.trim();
      if (!trimmed) {
        throw new ProjectV2DomainError("PROJECT_SCOPE_INVALID", "Task title is required.");
      }
      return options.tasks.create({
        id: id(),
        projectId: project.id,
        createdByUserId: actorId,
        title: trimmed,
        now: now(),
      });
    },

    async updateTask({ actorId, taskId, title, status }) {
      const task = await options.tasks.getById(taskId);
      if (!task) throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Task access denied.");
      const project = await options.projects.getById(task.projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.write")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Task access denied.");
      }
      const updated = await options.tasks.update({
        id: taskId,
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(status !== undefined ? { status } : {}),
        now: now(),
      });
      if (!updated) throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Task access denied.");
      return updated;
    },

    async listMembers({ actorId, projectId }) {
      const project = await options.projects.getById(projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.manage")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project member access denied.");
      }
      return options.projectMembers.listByProject(projectId);
    },

    async addMember({ actorId, projectId, userId, role }) {
      const project = await options.projects.getById(projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.manage")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project member access denied.");
      }
      const normalizedUserId = userId.trim();
      if (!normalizedUserId) {
        throw new ProjectV2DomainError(
          "PROJECT_MEMBER_INVALID_ROLE",
          "Member user id is required.",
        );
      }
      if (project.personalOwnerId === normalizedUserId) {
        throw new ProjectV2DomainError(
          "PROJECT_MEMBER_INVALID_ROLE",
          "The personal project owner is not a project member.",
        );
      }
      return options.projectMembers.upsert({
        projectId,
        userId: normalizedUserId,
        role,
        now: now(),
      });
    },

    async updateMember({ actorId, projectId, userId, role }) {
      const project = await options.projects.getById(projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.manage")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project member access denied.");
      }
      const existing = await options.projectMembers.getByProjectAndUser({ projectId, userId });
      if (!existing || existing.status !== "active") {
        throw new ProjectV2DomainError("PROJECT_MEMBER_NOT_FOUND", "Project member not found.");
      }
      return options.projectMembers.upsert({ projectId, userId, role, now: now() });
    },

    async removeMember({ actorId, projectId, userId }) {
      const project = await options.projects.getById(projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.manage")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project member access denied.");
      }
      const removed = await options.projectMembers.remove({ projectId, userId, now: now() });
      if (!removed) {
        throw new ProjectV2DomainError("PROJECT_MEMBER_NOT_FOUND", "Project member not found.");
      }
      return removed;
    },

    async updateProject({ actorId, projectId, title, description, stage, deadline }) {
      const project = await options.projects.getById(projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.write")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project update denied.");
      }
      if (title !== undefined && !title.trim()) {
        throw new ProjectV2DomainError("PROJECT_SCOPE_INVALID", "Project title is required.");
      }
      const updated = await options.projects.update({
        id: projectId,
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(stage !== undefined ? { stage } : {}),
        ...(deadline !== undefined ? { deadline } : {}),
        now: now(),
      });
      if (!updated)
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project update denied.");
      return updated;
    },

    async archiveProject({ actorId, projectId }) {
      const project = await options.projects.getById(projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.manage")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project archive denied.");
      }
      const archived = await options.projects.setArchived({
        id: projectId,
        archived: true,
        now: now(),
      });
      if (!archived)
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project archive denied.");
      return archived;
    },

    async restoreProject({ actorId, projectId }) {
      const project = await options.projects.getById(projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.manage")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project restore denied.");
      }
      const restored = await options.projects.setArchived({
        id: projectId,
        archived: false,
        now: now(),
      });
      if (!restored)
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project restore denied.");
      return restored;
    },

    async deleteProject({ actorId, projectId }) {
      const project = await options.projects.getById(projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.manage")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project delete denied.");
      }
      const deleted = await options.projects.delete(projectId);
      if (!deleted)
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project delete denied.");
    },

    async listReviews({ actorId, projectId }) {
      const project = await options.projects.getById(projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.read")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Review access denied.");
      }
      return options.reviews.listByProject(projectId);
    },

    async createReview({ actorId, projectId, assetVersionId, title }) {
      const project = await options.projects.getById(projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.write")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Review creation denied.");
      }
      const normalizedTitle = title.trim();
      if (!normalizedTitle) {
        throw new ProjectV2DomainError("PROJECT_SCOPE_INVALID", "Review title is required.");
      }
      return options.reviews.create({
        id: id(),
        projectId,
        assetVersionId,
        createdByUserId: actorId,
        title: normalizedTitle,
        now: now(),
      });
    },

    async updateReview({ actorId, reviewId, status }) {
      const review = await options.reviews.getById(reviewId);
      if (!review) throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Review access denied.");
      const project = await options.projects.getById(review.projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.manage")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Review approval denied.");
      }
      const updated = await options.reviews.update({ id: reviewId, status, now: now() });
      if (!updated)
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Review access denied.");
      return updated;
    },

    async listFeedback({ actorId, reviewId }) {
      const review = await options.reviews.getById(reviewId);
      if (!review)
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Feedback access denied.");
      const project = await options.projects.getById(review.projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.read")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Feedback access denied.");
      }
      return options.feedback.listByReview(reviewId);
    },

    async createFeedback({ actorId, reviewId, body }) {
      const review = await options.reviews.getById(reviewId);
      if (!review)
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Feedback creation denied.");
      const project = await options.projects.getById(review.projectId);
      if (
        !project ||
        !canProjectCapabilityV2(await accessFor(actorId, project), "project.comment")
      ) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Feedback creation denied.");
      }
      const normalizedBody = body.trim();
      if (!normalizedBody) {
        throw new ProjectV2DomainError("PROJECT_SCOPE_INVALID", "Feedback body is required.");
      }
      return options.feedback.create({
        id: id(),
        reviewId,
        projectId: review.projectId,
        authorId: actorId,
        body: normalizedBody,
        now: now(),
      });
    },

    async listAssets({ actorId, projectId }) {
      const project = await options.projects.getById(projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.read")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Asset access denied.");
      }
      return options.assets.listByProject(projectId);
    },

    async createAsset({ actorId, projectId, name }) {
      const project = await options.projects.getById(projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.write")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Asset creation denied.");
      }
      const normalizedName = name.trim();
      if (!normalizedName) {
        throw new ProjectV2DomainError("PROJECT_SCOPE_INVALID", "Asset name is required.");
      }
      return options.assets.create({
        id: id(),
        projectId,
        createdByUserId: actorId,
        name: normalizedName,
        now: now(),
      });
    },

    async listAssetVersions({ actorId, assetId }) {
      const asset = await options.assets.getById(assetId);
      if (!asset) throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Asset access denied.");
      const project = await options.projects.getById(asset.projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.read")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Asset access denied.");
      }
      return options.assetVersions.listByAsset(assetId);
    },

    async createAssetUpload({ actorId, projectId, byteSize, contentType, expectedHash }) {
      const project = await options.projects.getById(projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.write")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Asset upload denied.");
      }
      return options.blobStorage.createUpload({
        workspaceId: projectId,
        actorId,
        byteSize,
        contentType,
        expectedHash,
      });
    },

    async completeAssetUpload({
      actorId,
      assetId,
      uploadId,
      byteSize,
      contentType,
      checksum,
      body,
    }) {
      const asset = await options.assets.getById(assetId);
      if (!asset) throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Asset upload denied.");
      const project = await options.projects.getById(asset.projectId);
      if (!project || !canProjectCapabilityV2(await accessFor(actorId, project), "project.write")) {
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Asset upload denied.");
      }
      const completed = await options.blobStorage.completeUpload({
        uploadId,
        actorId,
        byteSize,
        contentType,
        blobHash: checksum,
        ...(body ? { body } : {}),
      });
      return options.assetVersions.create({
        id: id(),
        assetId,
        projectId: asset.projectId,
        createdByUserId: actorId,
        objectKey: `${asset.projectId}/${completed.blobHash}`,
        byteSize: completed.byteSize,
        mediaType: completed.contentType,
        checksum: completed.blobHash,
        now: now(),
      });
    },
  };
}
