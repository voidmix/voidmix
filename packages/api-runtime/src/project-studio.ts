import {
  createProjectAdministration,
  createAgentAdministration,
  AssetDomainError,
  ProjectDomainError,
  ProjectStudioDomainError,
  type Activity,
  type Asset,
  type AssetVersion,
  type AssetReference,
  type AssetRepositories,
  type AgentRepositories,
  type Feedback,
  type ProjectStudioRepositories,
  type Review,
  type PiSession,
  WorkspaceAccessError,
  projectLifecycle,
  projectProgress,
  type Project,
  type ProjectRepository,
  type ProjectTask,
  type UserRepository,
  type WorkspaceMembershipRepository,
  resolveProjectAccess,
} from "@voidmix/core";
import type {
  AccountProfileDto,
  ProjectDetailDto,
  ProjectStage,
  ProjectSummaryDto,
  ProjectTaskDto,
} from "@voidmix/contracts";

import type { ProjectStudioService } from "./modules.js";

interface CursorPage<Item> {
  items: Item[];
  nextCursor: string | null;
}

interface CreateProjectStudioServiceOptions {
  projects: ProjectRepository;
  users: UserRepository;
  memberships?: WorkspaceMembershipRepository;
  repositories?: ProjectStudioRepositories;
  assets?: AssetRepositories;
  agents?: AgentRepositories;
  now?: () => Date;
  id?: () => string;
}

/**
 * The first live Studio adapter. Project and task persistence already have a
 * repository boundary; the remaining Studio aggregates stay explicit until
 * their durable repositories exist.
 */
export function createProjectStudioService(
  options: CreateProjectStudioServiceOptions,
): ProjectStudioService {
  const administration = createProjectAdministration({
    projects: options.projects,
    ...(options.now ? { now: options.now } : {}),
    ...(options.id ? { id: options.id } : {}),
  });
  const agentAdministration = options.agents
    ? createAgentAdministration({
        repositories: options.agents,
        ...(options.now ? { now: options.now } : {}),
        ...(options.id ? { id: options.id } : {}),
      })
    : null;

  const parseCursor = (cursor: string | undefined) => {
    if (!cursor) return 0;
    const offset = Number.parseInt(cursor, 10);
    return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  };

  const workspaceIdFor = (project: Project): string => {
    if (!project.workspaceId) {
      throw new Error(`Project ${project.id} has no workspace tenancy.`);
    }
    return project.workspaceId;
  };

  const summary = async (project: Project): Promise<ProjectSummaryDto> => {
    const tasks = await administration.tasks(project.id);
    const lifecycle = projectLifecycle(project);
    return {
      id: project.id,
      workspaceId: workspaceIdFor(project),
      ownerId: project.ownerId,
      title: project.name,
      description: project.description || null,
      cover: project.cover ?? null,
      thumbnail: project.thumbnail ?? null,
      stage: lifecycle.stage,
      archived: lifecycle.archived,
      archivedAt: lifecycle.archivedAt,
      stageWasDefaulted: project.stage === undefined,
      progress: projectProgress(tasks),
      deadline: project.deadline ?? null,
      lastActivityAt: project.updatedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  };

  const task = (value: ProjectTask): ProjectTaskDto => ({
    id: value.id,
    projectId: value.projectId,
    title: value.title,
    status: value.status,
    createdBy: value.createdBy,
    updatedAt: value.updatedAt,
  });

  const review = (value: Review) => ({
    id: value.id,
    projectId: value.projectId,
    workspaceId: value.workspaceId,
    targetVersionId: value.targetVersionId,
    status: value.status,
    title: value.title,
    requestedBy: value.requestedBy,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    resolvedAt: value.resolvedAt,
    resolvedBy: value.resolvedBy,
  });

  const feedback = (value: Feedback) => ({
    id: value.id,
    reviewId: value.reviewId,
    projectId: value.projectId,
    targetVersionId: value.targetVersionId,
    authorId: value.authorId,
    body: value.body,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    resolvedAt: value.resolvedAt,
    resolvedBy: value.resolvedBy,
  });

  const activity = (value: Activity) => ({
    id: value.id,
    type: value.type,
    accountId: value.accountId,
    workspaceId: value.workspaceId,
    projectId: value.projectId,
    actorId: value.actorId,
    targetId: value.targetId,
    summary: value.summary,
    occurredAt: value.occurredAt,
  });

  const piSession = async (value: PiSession) => {
    const run = agentAdministration ? await agentAdministration.getRun(value.agentRunId) : null;
    return {
      id: value.id,
      projectId: value.projectId,
      workspaceId: value.workspaceId,
      agentRunId: value.agentRunId,
      requestedBy: value.requestedBy,
      prompt: value.prompt,
      context: value.context,
      status: run?.status ?? value.status,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      completedAt: value.completedAt,
      run: {
        sessionId: value.id,
        runId: value.agentRunId,
        status: run?.status ?? value.status,
        currentStepId: run?.currentStepId ?? null,
        progress: null,
        error: null,
        startedAt: run && run.status !== "queued" ? run.updatedAt : null,
        finishedAt: value.completedAt,
      },
    };
  };

  const studioRepositories = () => {
    if (!options.repositories) throw new Error("Project Studio repositories are not configured.");
    return options.repositories;
  };

  const recordActivity = async (input: {
    actorId: string;
    workspaceId: string;
    projectId: string | null;
    targetId: string | null;
    type: Activity["type"];
    summary: string;
  }): Promise<void> => {
    if (!options.repositories) return;
    await options.repositories.activity.create({
      ...input,
      accountId: input.actorId,
    });
  };

  const requireReview = async (actorId: string, reviewId: string): Promise<Review> => {
    const found = await studioRepositories().reviews.getById(reviewId);
    if (!found || !(await visibleProject(actorId, found.projectId))) {
      throw new ProjectStudioDomainError("REVIEW_NOT_FOUND", "The requested review was not found.");
    }
    return found;
  };

  const requireFeedback = async (actorId: string, feedbackId: string): Promise<Feedback> => {
    const found = await studioRepositories().feedback.getById(feedbackId);
    if (!found || !(await visibleProject(actorId, found.projectId))) {
      throw new ProjectStudioDomainError(
        "FEEDBACK_NOT_FOUND",
        "The requested feedback was not found.",
      );
    }
    return found;
  };

  const visibleProjects = async (actorId: string): Promise<Project[]> => {
    if (options.memberships?.listByUser && options.projects.listByWorkspace) {
      const memberships = await options.memberships.listByUser(actorId);
      const workspaceIds = memberships
        .filter((membership) => membership.status === "active")
        .sort(
          (left, right) =>
            Number(right.role === "owner" || right.role === "editor") -
              Number(left.role === "owner" || left.role === "editor") ||
            left.workspaceId.localeCompare(right.workspaceId),
        )
        .map((membership) => membership.workspaceId);
      const projects = await Promise.all(
        [...new Set(workspaceIds)].map((workspaceId) =>
          options.projects.listByWorkspace!(workspaceId),
        ),
      );
      return projects
        .flat()
        .sort(
          (left, right) =>
            right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id),
        );
    }
    return administration.list(actorId);
  };

  const visibleProject = async (actorId: string, projectId: string): Promise<Project | null> => {
    const listed = (await visibleProjects(actorId)).find((item) => item.id === projectId);
    if (listed) return listed;
    if (options.memberships?.listByUser && options.projects.listByWorkspace) return null;
    const project = await administration.get(projectId);
    return project?.ownerId === actorId ? project : null;
  };

  const assertWritableWorkspace = async (actorId: string, workspaceId: string): Promise<void> => {
    if (!options.memberships) return;
    const membership = await options.memberships?.getByUserAndWorkspace({
      userId: actorId,
      workspaceId,
    });
    if (
      !membership ||
      membership.status !== "active" ||
      (membership.role !== "owner" && membership.role !== "editor")
    )
      throw new WorkspaceAccessError();
  };

  const resolveCreationWorkspace = async (actorId: string, requested?: string): Promise<string> => {
    if (requested) {
      await assertWritableWorkspace(actorId, requested);
      return requested;
    }
    const memberships = options.memberships?.listByUser
      ? await options.memberships.listByUser(actorId)
      : [];
    const writable = memberships
      .filter(
        (membership) =>
          membership.status === "active" &&
          (membership.role === "owner" || membership.role === "editor"),
      )
      .sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.workspaceId.localeCompare(right.workspaceId),
      );
    const workspaceId = writable[0]?.workspaceId;
    if (!workspaceId) throw new WorkspaceAccessError();
    return workspaceId;
  };

  const assertProjectAccess = async (
    actorId: string,
    project: Project,
    required: "read" | "comment" | "write" | "manage",
  ): Promise<void> => {
    if (!options.memberships) return;
    const membership = await options.memberships.getByUserAndWorkspace({
      userId: actorId,
      workspaceId: workspaceIdFor(project),
    });
    if (!membership || membership.status !== "active") throw new WorkspaceAccessError();
    const member = options.repositories?.members
      ? await options.repositories.members.getByProjectAndUser({
          projectId: project.id,
          userId: actorId,
        })
      : null;
    const access = resolveProjectAccess({
      workspaceRole: membership.role,
      projectMember: member,
      isProjectOwner: project.ownerId === actorId,
    });
    const accessRank = { read: 1, comment: 2, write: 3, manage: 4 } as const;
    if (accessRank[access] < accessRank[required]) throw new WorkspaceAccessError();
  };

  const requireManageableProject = async (actorId: string, projectId: string): Promise<Project> => {
    const project = await visibleProject(actorId, projectId);
    if (!project)
      throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
    await assertProjectAccess(actorId, project, "manage");
    return project;
  };

  const detail = async (project: Project): Promise<ProjectDetailDto> => {
    const [projectSummary, tasks, reviews, sessions, members] = await Promise.all([
      summary(project),
      administration.tasks(project.id),
      options.repositories?.reviews.list({ projectId: project.id, limit: 100 }),
      options.repositories?.piSessions?.list({ projectId: project.id, limit: 100 }),
      options.repositories?.members?.listByProject(project.id),
    ]);
    const references = options.repositories?.assetReferences
      ? await options.repositories.assetReferences.listByProject({
          projectId: project.id,
          limit: 100,
        })
      : { items: [], nextCursor: null };
    return {
      ...projectSummary,
      brief: null,
      tasks: tasks.map(task),
      members:
        members?.map((member) => ({
          id: member.id,
          projectId: member.projectId,
          workspaceId: member.workspaceId,
          userId: member.userId,
          role: member.role,
          status: member.status,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        })) ?? [],
      assetReferences: await Promise.all(
        references.items.map(async (reference) => {
          const asset = options.assets
            ? await options.assets.assets.getById(reference.assetId)
            : null;
          return assetReference(reference, asset);
        }),
      ),
      reviews: reviews?.items.map(review) ?? [],
      sessions: sessions ? await Promise.all(sessions.items.map(piSession)) : [],
    };
  };

  const assetReference = (reference: AssetReference, _asset: Asset | null) => ({
    id: reference.id,
    projectId: reference.projectId,
    assetId: reference.assetId,
    versionId: reference.versionId,
    workspaceId: reference.workspaceId,
    label: reference.label,
    createdAt: reference.createdAt,
  });
  const assetDto = (asset: Asset) => ({ ...asset });
  const versionDto = (version: AssetVersion) => ({ ...version });

  const notImplemented = async <Result>(): Promise<Result> => {
    throw new Error("Project Studio capability is not implemented yet.");
  };

  const listProjectSummaries = async (input: {
    actorId: string;
    stage?: ProjectStage;
    archived?: boolean;
    limit: number;
    cursor?: string;
  }): Promise<CursorPage<ProjectSummaryDto>> => {
    const projects = await visibleProjects(input.actorId);
    const filtered = projects.filter((project) => {
      const lifecycle = projectLifecycle(project);
      return (
        (input.stage === undefined || lifecycle.stage === input.stage) &&
        (input.archived === undefined || lifecycle.archived === input.archived)
      );
    });
    const offset = parseCursor(input.cursor);
    const items = await Promise.all(
      filtered.slice(offset, offset + input.limit).map((project) => summary(project)),
    );
    const nextOffset = offset + items.length;
    return {
      items,
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
    };
  };

  return {
    async getSnapshot({ actorId }) {
      const user = await options.users.getById(actorId);
      if (!user) throw new Error(`Account ${actorId} was not found.`);
      const memberships = options.memberships?.listByUser
        ? await options.memberships.listByUser(actorId)
        : [];
      const projects = await listProjectSummaries({ actorId, limit: 100 });
      const workspaceIds = memberships
        .filter((membership) => membership.status === "active")
        .map((membership) => membership.workspaceId);
      const account: AccountProfileDto = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      };
      return {
        account: {
          ...account,
          workspaceIds: [
            ...new Set(
              workspaceIds.length
                ? workspaceIds
                : projects.items.map((project) => project.workspaceId),
            ),
          ],
        },
        projects: projects.items,
        reviewAttention: options.repositories
          ? (
              await Promise.all(
                projects.items
                  .filter((project) => !project.archived)
                  .map((project) =>
                    options.repositories!.reviews.list({ projectId: project.id, limit: 20 }),
                  ),
              )
            )
              .flatMap((page) => page.items)
              .filter((item) => item.status === "open" || item.status === "changes_requested")
              .map(review)
              .slice(0, 20)
          : [],
        recentActivity: options.repositories
          ? (await options.repositories.activity.listByAccount(actorId, { limit: 20 })).items.map(
              activity,
            )
          : [],
        activeSessions: options.repositories?.piSessions
          ? await Promise.all(
              (
                await Promise.all(
                  projects.items.map((project) =>
                    options.repositories!.piSessions!.list({ projectId: project.id, limit: 20 }),
                  ),
                )
              )
                .flatMap((page) => page.items)
                .filter((session) =>
                  ["queued", "running", "waiting_for_approval"].includes(session.status),
                )
                .map((session) => piSession(session)),
            )
          : [],
        nextProjectsCursor: projects.nextCursor,
      };
    },

    listProjects: listProjectSummaries,

    async getProject({ actorId, projectId }) {
      const project = await visibleProject(actorId, projectId);
      return project ? detail(project) : null;
    },

    async addProjectMember({ actorId, projectId, userId, role }) {
      const project = await requireManageableProject(actorId, projectId);
      const repositories = studioRepositories();
      if (!repositories.members) throw new Error("Project member repository is not configured.");
      const user = await options.users.getById(userId);
      if (!user)
        throw new ProjectStudioDomainError(
          "PROJECT_MEMBER_NOT_FOUND",
          "The requested account was not found.",
        );
      if (options.memberships) {
        const membership = await options.memberships.getByUserAndWorkspace({
          userId,
          workspaceId: workspaceIdFor(project),
        });
        if (!membership || membership.status !== "active") throw new WorkspaceAccessError();
      }
      const member = await repositories.members.upsert({
        projectId,
        workspaceId: workspaceIdFor(project),
        userId,
        role,
        status: "active",
      });
      return member;
    },

    async updateProjectMember({ actorId, projectId, userId, role }) {
      await requireManageableProject(actorId, projectId);
      const repositories = studioRepositories();
      if (!repositories.members) throw new Error("Project member repository is not configured.");
      const current = await repositories.members.getByProjectAndUser({ projectId, userId });
      if (!current)
        throw new ProjectStudioDomainError(
          "PROJECT_MEMBER_NOT_FOUND",
          "The requested project member was not found.",
        );
      return repositories.members.upsert({ ...current, role, status: "active" });
    },

    async removeProjectMember({ actorId, projectId, userId }) {
      await requireManageableProject(actorId, projectId);
      const repositories = studioRepositories();
      if (!repositories.members) throw new Error("Project member repository is not configured.");
      const current = await repositories.members.getByProjectAndUser({ projectId, userId });
      if (!current)
        throw new ProjectStudioDomainError(
          "PROJECT_MEMBER_NOT_FOUND",
          "The requested project member was not found.",
        );
      return repositories.members.remove({ projectId, userId });
    },

    async createProject({ actorId, workspaceId, title, description, deadline }) {
      const resolvedWorkspaceId = await resolveCreationWorkspace(actorId, workspaceId);
      const project = await administration.create({
        ownerId: actorId,
        name: title,
        workspaceId: resolvedWorkspaceId,
        ...(description !== undefined && description !== null ? { description } : {}),
        ...(deadline !== undefined ? { deadline } : {}),
      });
      await recordActivity({
        actorId,
        workspaceId: workspaceIdFor(project),
        projectId: project.id,
        targetId: project.id,
        type: "project.created",
        summary: `Created project ${project.name}`,
      });
      return detail(project);
    },

    async updateProject({
      actorId,
      projectId,
      title,
      description,
      cover,
      thumbnail,
      deadline,
      stage,
    }) {
      const current = await visibleProject(actorId, projectId);
      if (!current)
        throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
      await assertProjectAccess(actorId, current, "write");
      const project = await administration.update({
        id: projectId,
        actorId,
        ...(title !== undefined ? { name: title } : {}),
        ...(description !== undefined ? { description: description ?? "" } : {}),
        ...(cover !== undefined ? { cover } : {}),
        ...(thumbnail !== undefined ? { thumbnail } : {}),
        ...(deadline !== undefined ? { deadline } : {}),
        ...(stage !== undefined ? { stage } : {}),
      });
      await recordActivity({
        actorId,
        workspaceId: workspaceIdFor(project),
        projectId: project.id,
        targetId: project.id,
        type:
          stage !== undefined && stage !== projectLifecycle(current).stage
            ? "project.stage.changed"
            : "project.updated",
        summary: `Updated project ${project.name}`,
      });
      return detail(project);
    },

    async archiveProject({ actorId, projectId }) {
      const current = await visibleProject(actorId, projectId);
      if (!current)
        throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
      await assertProjectAccess(actorId, current, "manage");
      const project = await administration.update({ id: projectId, actorId, archived: true });
      await recordActivity({
        actorId,
        workspaceId: workspaceIdFor(project),
        projectId: project.id,
        targetId: project.id,
        type: "project.archived",
        summary: `Archived project ${project.name}`,
      });
      return summary(project);
    },

    async restoreProject({ actorId, projectId }) {
      const current = await visibleProject(actorId, projectId);
      if (!current)
        throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
      await assertProjectAccess(actorId, current, "manage");
      const project = await administration.update({ id: projectId, actorId, archived: false });
      await recordActivity({
        actorId,
        workspaceId: workspaceIdFor(project),
        projectId: project.id,
        targetId: project.id,
        type: "project.restored",
        summary: `Restored project ${project.name}`,
      });
      return summary(project);
    },

    async listProjectAssets({ actorId, projectId, limit, cursor }) {
      const project = await visibleProject(actorId, projectId);
      if (!project)
        throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
      if (!options.repositories?.assetReferences || !options.assets)
        return { items: [], nextCursor: null };
      const page = await options.repositories.assetReferences.listByProject({
        projectId,
        limit,
        ...(cursor ? { cursor } : {}),
      });
      return {
        items: await Promise.all(
          page.items.map(async (reference) =>
            assetReference(reference, await options.assets!.assets.getById(reference.assetId)),
          ),
        ),
        nextCursor: page.nextCursor,
      };
    },

    async createProjectAsset({ actorId, projectId, assetId, versionId, label }) {
      const project = await visibleProject(actorId, projectId);
      if (!project)
        throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
      await assertProjectAccess(actorId, project, "write");
      if (!options.repositories?.assetReferences || !options.assets) {
        throw new Error("Project asset references are not configured.");
      }
      const asset = await options.assets.assets.getById(assetId);
      if (!asset || asset.workspaceId !== workspaceIdFor(project)) {
        throw new AssetDomainError("ASSET_NOT_FOUND", "The requested asset was not found.");
      }
      if (versionId !== undefined && versionId !== null) {
        const version = await options.assets.versions.getById(versionId);
        if (!version || version.assetId !== assetId || version.workspaceId !== asset.workspaceId) {
          throw new AssetDomainError(
            "ASSET_VERSION_NOT_FOUND",
            "The requested asset version was not found.",
          );
        }
      }
      const reference = await options.repositories.assetReferences.create({
        projectId,
        assetId,
        versionId: versionId ?? null,
        workspaceId: asset.workspaceId,
        label: label ?? null,
      });
      await recordActivity({
        actorId,
        workspaceId: asset.workspaceId,
        projectId,
        targetId: reference.id,
        type: "asset.added",
        summary: `Added asset ${asset.path} to project`,
      });
      return assetReference(reference, asset);
    },

    async listProjectTasks({ actorId, projectId, status, limit, cursor }) {
      const project = await visibleProject(actorId, projectId);
      if (!project)
        throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
      const tasks = (await administration.tasks(project.id)).filter(
        (item) => status === undefined || item.status === status,
      );
      const offset = parseCursor(cursor);
      const items = tasks.slice(offset, offset + limit).map(task);
      const nextOffset = offset + items.length;
      return {
        items,
        nextCursor: nextOffset < tasks.length ? String(nextOffset) : null,
      };
    },

    async getProjectTask({ actorId, taskId }) {
      const projects = await visibleProjects(actorId);
      for (const project of projects) {
        const found = (await administration.tasks(project.id)).find((item) => item.id === taskId);
        if (found) return task(found);
      }
      return null;
    },

    async createProjectTask({ actorId, projectId, title }) {
      const project = await visibleProject(actorId, projectId);
      if (!project)
        throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
      await assertProjectAccess(actorId, project, "write");
      const created = await administration.createTask({ projectId, actorId, title });
      await recordActivity({
        actorId,
        workspaceId: workspaceIdFor(project),
        projectId,
        targetId: created.id,
        type: "project.updated",
        summary: `Created task ${created.title}`,
      });
      return task(created);
    },

    async updateProjectTask({ actorId, taskId, title, status }) {
      const projects = await visibleProjects(actorId);
      for (const project of projects) {
        const existing = (await administration.tasks(project.id)).find(
          (item) => item.id === taskId,
        );
        if (existing) {
          await assertProjectAccess(actorId, project, "write");
          const updated = await administration.updateTask({
            taskId,
            actorId,
            ...(title !== undefined ? { title } : {}),
            ...(status !== undefined ? { status } : {}),
          });
          await recordActivity({
            actorId,
            workspaceId: workspaceIdFor(project),
            projectId: project.id,
            targetId: updated.id,
            type: "project.updated",
            summary: `Updated task ${updated.title}`,
          });
          return task(updated);
        }
      }
      throw new ProjectDomainError(
        "PROJECT_NOT_FOUND",
        "The requested project task was not found.",
      );
    },

    async searchLibrary({ actorId, query, projectId, limit, cursor }) {
      const projects = await visibleProjects(actorId);
      const normalizedQuery = query?.toLowerCase();
      const filtered = projects.filter((project) => {
        if (projectId && project.id !== projectId) return false;
        return (
          !normalizedQuery ||
          project.name.toLowerCase().includes(normalizedQuery) ||
          project.description.toLowerCase().includes(normalizedQuery)
        );
      });
      const offset = parseCursor(cursor);
      const items = await Promise.all(
        filtered.slice(offset, offset + limit).map((project) => summary(project)),
      );
      const nextOffset = offset + items.length;
      const workspaceIds = new Set(projects.map((project) => workspaceIdFor(project)));
      const assetRows = options.assets?.assets.listByWorkspace
        ? (
            await Promise.all(
              [...workspaceIds].map((workspaceId) =>
                options.assets!.assets.listByWorkspace!({
                  workspaceId,
                  ...(query ? { query } : {}),
                  limit: 100,
                }),
              ),
            )
          ).flatMap((page) => page.items)
        : [];
      const versionRows = options.assets?.versions.listByAsset
        ? (
            await Promise.all(
              assetRows.map((asset) =>
                options.assets!.versions.listByAsset!({ assetId: asset.id, limit: 100 }),
              ),
            )
          ).flatMap((page) => page.items)
        : [];
      return {
        assets: assetRows.map(assetDto),
        versions: versionRows.map(versionDto),
        projects: items,
        nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
      };
    },

    async getAssetWorkspace({ actorId, assetId }) {
      if (!options.assets) return null;
      const asset = await options.assets.assets.getById(assetId);
      if (
        !asset ||
        !(await visibleProjects(actorId)).some(
          (project) => project.workspaceId === asset.workspaceId,
        )
      )
        return null;
      return asset.workspaceId;
    },
    async listAssetVersions({ actorId, assetId, limit, cursor }) {
      if (!options.assets) return { items: [], nextCursor: null };
      const workspace = await (async () => {
        const asset = await options.assets!.assets.getById(assetId);
        return asset &&
          (await visibleProjects(actorId)).some(
            (project) => project.workspaceId === asset.workspaceId,
          )
          ? asset.workspaceId
          : null;
      })();
      if (!workspace) return { items: [], nextCursor: null };
      if (!options.assets.versions.listByAsset) return { items: [], nextCursor: null };
      const page = await options.assets.versions.listByAsset({
        assetId,
        limit,
        ...(cursor ? { cursor } : {}),
      });
      return { items: page.items.map(versionDto), nextCursor: page.nextCursor };
    },
    async listReviews({ actorId, projectId, status, limit, cursor }) {
      if (!options.repositories) return notImplemented();
      const project = await visibleProject(actorId, projectId);
      if (!project)
        throw new ProjectStudioDomainError(
          "REVIEW_NOT_FOUND",
          "The requested project was not found.",
        );
      const page = await options.repositories.reviews.list({
        projectId,
        limit,
        ...(status !== undefined ? { status } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
      });
      return { items: page.items.map(review), nextCursor: page.nextCursor };
    },
    async getReview({ actorId, reviewId }) {
      if (!options.repositories) return null;
      const found = await options.repositories.reviews.getById(reviewId);
      return found && (await visibleProject(actorId, found.projectId)) ? review(found) : null;
    },
    async createReview({ actorId, projectId, targetVersionId, title }) {
      if (!options.repositories) return notImplemented();
      const project = await visibleProject(actorId, projectId);
      if (!project)
        throw new ProjectStudioDomainError(
          "REVIEW_NOT_FOUND",
          "The requested project was not found.",
        );
      await assertProjectAccess(actorId, project, "write");
      const created = await options.repositories.reviews.create({
        projectId,
        workspaceId: workspaceIdFor(project),
        targetVersionId,
        title,
        requestedBy: actorId,
      });
      await recordActivity({
        actorId,
        workspaceId: workspaceIdFor(project),
        projectId,
        targetId: created.id,
        type: "review.created",
        summary: `Created review ${created.title}`,
      });
      return review(created);
    },
    async updateReview({ actorId, reviewId, status }) {
      if (!options.repositories) return notImplemented();
      const current = await requireReview(actorId, reviewId);
      const project = await visibleProject(actorId, current.projectId);
      if (!project)
        throw new ProjectStudioDomainError(
          "REVIEW_NOT_FOUND",
          "The requested review was not found.",
        );
      await assertProjectAccess(actorId, project, "write");
      const updated = await options.repositories.reviews.update({ id: reviewId, status, actorId });
      await recordActivity({
        actorId,
        workspaceId: current.workspaceId,
        projectId: current.projectId,
        targetId: current.id,
        type: "review.status.changed",
        summary: `Review ${current.title} changed to ${updated.status}`,
      });
      return review(updated);
    },
    async resolveReview({ actorId, reviewId }) {
      if (!options.repositories) return notImplemented();
      const current = await requireReview(actorId, reviewId);
      const project = await visibleProject(actorId, current.projectId);
      if (!project)
        throw new ProjectStudioDomainError(
          "REVIEW_NOT_FOUND",
          "The requested review was not found.",
        );
      await assertProjectAccess(actorId, project, "write");
      const resolved = await options.repositories.reviews.resolve({ id: reviewId, actorId });
      await recordActivity({
        actorId,
        workspaceId: current.workspaceId,
        projectId: current.projectId,
        targetId: current.id,
        type: "review.status.changed",
        summary: `Closed review ${current.title}`,
      });
      return review(resolved);
    },
    async listFeedback({ actorId, reviewId, status, limit, cursor }) {
      if (!options.repositories) return notImplemented();
      await requireReview(actorId, reviewId);
      const page = await options.repositories.feedback.list({
        reviewId,
        limit,
        ...(status !== undefined ? { status } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
      });
      return { items: page.items.map(feedback), nextCursor: page.nextCursor };
    },
    async getFeedback({ actorId, feedbackId }) {
      if (!options.repositories) return null;
      const found = await requireFeedback(actorId, feedbackId);
      return found ? feedback(found) : null;
    },
    async createFeedback({ actorId, reviewId, targetVersionId, body }) {
      if (!options.repositories) return notImplemented();
      const found = await requireReview(actorId, reviewId);
      if (!targetVersionId)
        throw new ProjectStudioDomainError(
          "FEEDBACK_NOT_FOUND",
          "Feedback requires a target version.",
        );
      const project = await visibleProject(actorId, found.projectId);
      if (!project)
        throw new ProjectStudioDomainError(
          "FEEDBACK_NOT_FOUND",
          "The requested feedback was not found.",
        );
      await assertProjectAccess(actorId, project, "comment");
      const created = await options.repositories.feedback.create({
        reviewId,
        projectId: found.projectId,
        targetVersionId,
        authorId: actorId,
        body,
      });
      await recordActivity({
        actorId,
        workspaceId: found.workspaceId,
        projectId: found.projectId,
        targetId: created.id,
        type: "feedback.created",
        summary: `Added feedback to ${found.title}`,
      });
      return feedback(created);
    },
    async updateFeedback({ actorId, feedbackId, status }) {
      if (!options.repositories) return notImplemented();
      const current = await requireFeedback(actorId, feedbackId);
      const project = await visibleProject(actorId, current.projectId);
      if (!project)
        throw new ProjectStudioDomainError(
          "FEEDBACK_NOT_FOUND",
          "The requested feedback was not found.",
        );
      await assertProjectAccess(actorId, project, "comment");
      const updated = await options.repositories.feedback.update({
        id: feedbackId,
        status,
        actorId,
      });
      if (updated.status === "resolved" && current.status !== "resolved") {
        const project = await visibleProject(actorId, updated.projectId);
        if (project) {
          await recordActivity({
            actorId,
            workspaceId: workspaceIdFor(project),
            projectId: updated.projectId,
            targetId: updated.id,
            type: "feedback.resolved",
            summary: `Resolved feedback on ${project.name}`,
          });
        }
      }
      return feedback(updated);
    },
    async listActivity({ actorId, projectId, limit, cursor }) {
      if (!options.repositories) return notImplemented();
      if (projectId && !(await visibleProject(actorId, projectId))) {
        throw new ProjectStudioDomainError(
          "REVIEW_NOT_FOUND",
          "The requested project was not found.",
        );
      }
      const page = await options.repositories.activity.list({
        accountId: actorId,
        limit,
        ...(projectId !== undefined ? { projectId } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
      });
      return { items: page.items.map(activity), nextCursor: page.nextCursor };
    },
    async createPiSession({ actorId, projectId, prompt, context }) {
      if (!agentAdministration || !options.repositories?.piSessions) return notImplemented();
      const project = await visibleProject(actorId, projectId);
      if (!project)
        throw new ProjectDomainError("PROJECT_NOT_FOUND", "The requested project was not found.");
      await assertProjectAccess(actorId, project, "write");
      const run = await agentAdministration.createRun({
        workspaceId: workspaceIdFor(project),
        requestedBy: actorId,
        goal: prompt,
      });
      const session = await options.repositories.piSessions.create({
        projectId,
        workspaceId: workspaceIdFor(project),
        agentRunId: run.id,
        requestedBy: actorId,
        prompt,
        context,
        status: run.status,
      });
      await recordActivity({
        actorId,
        workspaceId: workspaceIdFor(project),
        projectId,
        targetId: session.id,
        type: "pi.session.started",
        summary: `Started Pi session for ${project.name}`,
      });
      return piSession(session);
    },
    async getPiSession({ actorId, sessionId }) {
      if (!options.repositories?.piSessions) return null;
      const session = await options.repositories.piSessions.getById(sessionId);
      if (!session || !(await visibleProject(actorId, session.projectId))) return null;
      return piSession(session);
    },
    async cancelPiSession({ actorId, sessionId }) {
      if (!agentAdministration || !options.repositories?.piSessions) return notImplemented();
      const session = await options.repositories.piSessions.getById(sessionId);
      if (!session || !(await visibleProject(actorId, session.projectId))) {
        throw new ProjectStudioDomainError(
          "PI_SESSION_NOT_FOUND",
          "The requested Pi session was not found.",
        );
      }
      const project = await visibleProject(actorId, session.projectId);
      if (!project)
        throw new ProjectStudioDomainError(
          "PI_SESSION_NOT_FOUND",
          "The requested Pi session was not found.",
        );
      await assertProjectAccess(actorId, project, "write");
      const run = await agentAdministration.getRun(session.agentRunId);
      if (run && !["succeeded", "failed", "cancelled"].includes(run.status)) {
        await agentAdministration.transitionRun({ runId: run.id, status: "cancelled" });
      }
      const updated = await options.repositories.piSessions.update({
        id: session.id,
        status: "cancelled",
        completedAt: options.now?.() ?? new Date(),
      });
      return piSession(updated);
    },
    async retryPiSession({ actorId, sessionId }) {
      if (!agentAdministration || !options.repositories?.piSessions) return notImplemented();
      const session = await options.repositories.piSessions.getById(sessionId);
      const project = session ? await visibleProject(actorId, session.projectId) : null;
      if (!session || !project) {
        throw new ProjectStudioDomainError(
          "PI_SESSION_NOT_FOUND",
          "The requested Pi session was not found.",
        );
      }
      await assertProjectAccess(actorId, project, "write");
      const run = await agentAdministration.createRun({
        workspaceId: workspaceIdFor(project),
        requestedBy: actorId,
        goal: session.prompt,
      });
      const updated = await options.repositories.piSessions.update({
        id: session.id,
        agentRunId: run.id,
        status: run.status,
        completedAt: null,
      });
      return piSession(updated);
    },
  };
}
