import { createApiClient } from "@voidmix/client";
import { InMemorySystemSettingsRepository, InMemoryUserRepository } from "@voidmix/db";
import { createAgentRunApplication, type ProjectApplication } from "@voidmix/application";
import {
  ProjectV2DomainError,
  type AgentRunV2,
  type AgentRunV2Repository,
  type MailSettingsFallback,
  type User,
} from "@voidmix/core";
import { describe, expect, it } from "vite-plus/test";

import { createApiApp } from "./app.js";
import { createApiModules } from "./modules.js";
import { createHeaderSessionResolver } from "./session.js";

const now = new Date("2026-01-01T00:00:00.000Z");
const users: User[] = [
  {
    id: "user-1",
    email: "user@example.com",
    displayName: "User",
    role: "user",
    status: "active",
    createdAt: now,
  },
  {
    id: "admin-1",
    email: "admin@example.com",
    displayName: "Admin",
    role: "admin",
    status: "active",
    createdAt: now,
  },
];

const project = {
  id: "project-1",
  createdByUserId: "user-1",
  personalOwnerId: "user-1",
  organizationId: null,
  title: "First project",
  description: null,
  stage: "draft" as const,
  archived: false,
  deadline: null,
  createdAt: now,
  updatedAt: now,
};

function createProjectApplication(): ProjectApplication {
  const notImplemented = async (): Promise<never> => {
    throw new Error("Not implemented in API contract smoke tests.");
  };
  return {
    get: async ({ actorId, projectId }) =>
      actorId === project.personalOwnerId && projectId === project.id
        ? { project, access: "manage" as const }
        : null,
    listForUser: async (userId) => (userId === project.personalOwnerId ? [project] : []),
    create: async ({ actorId, title, description }) => ({
      ...project,
      id: `${actorId}-created`,
      createdByUserId: actorId,
      personalOwnerId: actorId,
      title,
      description: description ?? null,
    }),
    assertCapability: async ({ actorId, projectId }) => {
      if (actorId !== project.personalOwnerId || projectId !== project.id)
        throw new ProjectV2DomainError("PROJECT_ACCESS_DENIED", "Project access denied.");
      return project;
    },
    listTasks: notImplemented,
    createTask: notImplemented,
    updateTask: notImplemented,
    listMembers: notImplemented,
    addMember: notImplemented,
    updateMember: notImplemented,
    removeMember: notImplemented,
    updateProject: notImplemented,
    archiveProject: notImplemented,
    restoreProject: notImplemented,
    deleteProject: notImplemented,
    listReviews: notImplemented,
    createReview: notImplemented,
    updateReview: notImplemented,
    listFeedback: notImplemented,
    createFeedback: notImplemented,
    listAssets: notImplemented,
    createAsset: notImplemented,
    listAssetVersions: notImplemented,
    createAssetUpload: notImplemented,
    completeAssetUpload: notImplemented,
    listActivity: notImplemented,
  } as ProjectApplication;
}

function createApp() {
  const userRepository = new InMemoryUserRepository(users);
  const settings = new InMemorySystemSettingsRepository({
    auditEvents: userRepository.auditEvents,
  });
  const mailFallback: MailSettingsFallback = {
    enabled: { value: false, source: "default" },
    from: { value: null, source: "missing" },
    fromName: { value: "Voidmix", source: "default" },
    templatesBaseUrl: { value: null, source: "missing" },
    resendApiKey: { value: null, source: "missing" },
  };
  const projects = createProjectApplication();
  const runs = new Map<string, AgentRunV2>();
  const repository: AgentRunV2Repository = {
    getById: async (id) => runs.get(id) ?? null,
    create: async ({ now, ...input }) => {
      const run: AgentRunV2 = {
        ...input,
        status: "queued",
        output: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      };
      runs.set(run.id, run);
      return run;
    },
    updateStatus: async ({ id, status, now }) => {
      const run = runs.get(id);
      if (!run) return null;
      Object.assign(run, { status, updatedAt: now });
      return run;
    },
  };
  return createApiApp({
    modules: createApiModules({
      users: userRepository,
      settings,
      mailFallback,
      v2Projects: projects,
      v2AgentRuns: createAgentRunApplication({ projects, runs: repository, now: () => now }),
      now: () => now,
    }),
    resolveSession: createHeaderSessionResolver(),
    allowedOrigins: ["http://voidmix.test"],
    authHandler: async () => new Response(null, { status: 404 }),
    now: () => now,
  });
}

function clientFor(userId?: string, role = "user") {
  const app = createApp();
  return createApiClient({
    baseUrl: "http://voidmix.test",
    headers: userId
      ? {
          "x-voidmix-user-id": userId,
          "x-voidmix-role": role,
          "x-voidmix-email": `${userId}@example.com`,
          "x-voidmix-display-name": userId,
        }
      : {},
    fetch: async (input, init) => app.fetch(new Request(input, init)),
  });
}

describe("canonical API", () => {
  it("serves health and public auth capabilities", async () => {
    const client = clientFor();
    expect((await client.health({})).status).toBe("ok");
    expect((await client.auth.capabilities.get({})).registrationAvailable).toBe(false);
  });

  it("requires a session for account and projects", async () => {
    const client = clientFor();
    await expect(client.account.get({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(client.projects.list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("scopes project reads and creates to the authenticated account", async () => {
    const client = clientFor("user-1");
    expect((await client.account.get({})).id).toBe("user-1");
    expect((await client.projects.list({})).items).toHaveLength(1);
    expect((await client.projects.get({ projectId: "project-1" })).access).toBe("manage");
    expect((await client.projects.create({ title: "New project" })).personalOwnerId).toBe("user-1");
  });

  it("creates, cancels and retries Agent runs through command dispatch", async () => {
    const runs = clientFor("user-1").projects.agentRuns;
    const created = await runs.create({
      projectId: project.id,
      idempotencyKey: "first",
      input: {},
    });
    expect(created.status).toBe("queued");
    expect(created.createdAt).toBeInstanceOf(Date);
    const cancelled = await runs.cancel({ runId: created.id });
    expect(cancelled.status).toBe("cancelled");
    const retried = await runs.retry({ runId: cancelled.id });
    expect(retried).toMatchObject({ status: "queued", attempt: 2, requestedByUserId: "user-1" });
    await expect(runs.retry({ runId: retried.id })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(runs.cancel({ runId: "missing" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      clientFor("outsider").projects.agentRuns.create({
        projectId: project.id,
        idempotencyKey: "denied",
        input: {},
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps admin user routes behind admin capabilities", async () => {
    await expect(clientFor("user-1").admin.users.list({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect((await clientFor("admin-1", "admin").admin.users.list({})).items).toHaveLength(2);
  });
});
