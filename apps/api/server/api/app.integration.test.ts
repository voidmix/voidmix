import { createApiClient } from "@voidmix/client";
import { InMemorySystemSettingsRepository, InMemoryUserRepository } from "@voidmix/db";
import type { ProjectApplication } from "@voidmix/application";
import type { MailSettingsFallback, User } from "@voidmix/core";
import type { Mailer } from "@voidmix/mail/types";
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
    assertCapability: notImplemented,
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
  const mailer: Mailer = {
    sendVerification: async () => {},
    sendPasswordReset: async () => {},
    sendWelcome: async () => {},
    sendTest: async () => {},
  };
  return createApiApp({
    modules: createApiModules({
      users: userRepository,
      settings,
      mailFallback,
      mailer,
      v2Projects: createProjectApplication(),
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

  it("keeps admin user routes behind admin capabilities", async () => {
    await expect(clientFor("user-1").admin.users.list({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect((await clientFor("admin-1", "admin").admin.users.list({})).items).toHaveLength(2);
  });
});
