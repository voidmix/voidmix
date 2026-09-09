import { createApiClient } from "@voidmix/client";
import {
  createInMemoryAgentRepositories,
  createInMemoryAssetRepositories,
  createInMemoryProjectStudioRepositories,
  InMemoryBlobStorageRepository,
  InMemoryProjectRepository,
  InMemorySystemSettingsRepository,
  InMemoryUserRepository,
  InMemoryWorkspaceMembershipRepository,
} from "@voidmix/db";
import type {
  MailSettingsFallback,
  AgentRepositories,
  AssetRepositories,
  SystemSettingsRepository,
  User,
  UserRepository,
} from "@voidmix/core";
import { ProjectDomainError } from "@voidmix/core";
import { configureLogger } from "@voidmix/logger";
import type { Mailer } from "@voidmix/mail/types";
import { describe, expect, it } from "vite-plus/test";

import { createApiApp } from "./app.js";
import { createApiModules, type ApiModules, type ProjectStudioService } from "./modules.js";
import { createHeaderSessionResolver, type SessionResolver } from "./session.js";

const seed: User[] = [
  {
    id: "owner-1",
    email: "owner@example.com",
    displayName: "Owner",
    role: "owner",
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "admin-1",
    email: "admin@example.com",
    displayName: "Admin",
    role: "admin",
    status: "active",
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
  },
  {
    id: "user-1",
    email: "user@example.com",
    displayName: "User",
    role: "user",
    status: "active",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

const testMailFallback: MailSettingsFallback = {
  enabled: { value: true, source: "default" },
  from: { value: null, source: "missing" },
  fromName: { value: "Voidmix", source: "default" },
  templatesBaseUrl: { value: null, source: "missing" },
  resendApiKey: { value: null, source: "missing" },
};

const testMailer: Mailer = {
  sendVerification: async () => {},
  sendPasswordReset: async () => {},
  sendWelcome: async () => {},
  sendTest: async () => {},
};

const studioTimestamp = new Date("2026-09-09T00:00:00.000Z");
const studioProject = {
  id: "project-1",
  workspaceId: "workspace-1",
  ownerId: "owner-1",
  title: "Launch film",
  description: null,
  cover: null,
  thumbnail: null,
  stage: "draft" as const,
  archived: false,
  archivedAt: null,
  stageWasDefaulted: false,
  progress: null,
  deadline: null,
  lastActivityAt: studioTimestamp,
  createdAt: studioTimestamp,
  updatedAt: studioTimestamp,
  brief: null,
  tasks: [],
  members: [],
  assetReferences: [],
  reviews: [],
  sessions: [],
};

function createStudioService(overrides: Partial<ProjectStudioService> = {}): ProjectStudioService {
  const unavailable = async (): Promise<never> => {
    throw new Error("Unexpected Project Studio service call.");
  };
  return {
    getSnapshot: unavailable,
    listProjects: unavailable,
    getProject: unavailable,
    createProject: unavailable,
    updateProject: unavailable,
    archiveProject: unavailable,
    restoreProject: unavailable,
    listProjectAssets: unavailable,
    createProjectAsset: unavailable,
    listProjectTasks: unavailable,
    getProjectTask: unavailable,
    createProjectTask: unavailable,
    updateProjectTask: unavailable,
    searchLibrary: unavailable,
    getAssetWorkspace: unavailable,
    listAssetVersions: unavailable,
    listReviews: unavailable,
    getReview: unavailable,
    createReview: unavailable,
    updateReview: unavailable,
    resolveReview: unavailable,
    listFeedback: unavailable,
    getFeedback: unavailable,
    createFeedback: unavailable,
    updateFeedback: unavailable,
    listActivity: unavailable,
    createPiSession: unavailable,
    getPiSession: unavailable,
    cancelPiSession: unavailable,
    retryPiSession: unavailable,
    addProjectMember: unavailable,
    updateProjectMember: unavailable,
    removeProjectMember: unavailable,
    ...overrides,
  };
}

function createTestApiApp(
  options: {
    users?: UserRepository;
    settings?: SystemSettingsRepository;
    mailFallback?: MailSettingsFallback;
    mailer?: Mailer;
    allowedOrigins?: readonly string[];
    authHandler?: (request: Request) => Promise<Response>;
    id?: () => string;
    resolveSession?: SessionResolver;
    modules?: ApiModules;
  } = {},
) {
  const users = options.users ?? new InMemoryUserRepository(seed);
  const settings =
    options.settings ??
    new InMemorySystemSettingsRepository(
      users instanceof InMemoryUserRepository ? { auditEvents: users.auditEvents } : {},
    );
  const mailFallback = options.mailFallback ?? testMailFallback;
  const mailer = options.mailer ?? testMailer;
  return createApiApp({
    modules:
      options.modules ??
      createApiModules({
        users,
        settings,
        mailFallback,
        mailer,
        ...(options.id ? { id: options.id } : {}),
      }),
    resolveSession: options.resolveSession ?? createHeaderSessionResolver(),
    allowedOrigins: options.allowedOrigins ?? ["http://voidmix.test"],
    authHandler:
      options.authHandler ??
      (async () => new Response("Auth handler is not configured.", { status: 404 })),
    ...(options.id ? { id: options.id } : {}),
  });
}

function setup(
  role: "user" | "admin" | "owner",
  actorId: string,
  configured = true,
  resolveSession?: SessionResolver,
) {
  const repository = new InMemoryUserRepository(seed);
  const settings = new InMemorySystemSettingsRepository({
    ...(configured
      ? {
          settings: { "mail.from": "mail@example.com" },
          secrets: { "mail.resend_api_key": "database-key" },
        }
      : {}),
    auditEvents: repository.auditEvents,
  });
  const sentRecipients: string[] = [];
  const sentMailInputs: Array<Parameters<Mailer["sendTest"]>[0]> = [];
  const mailer: Mailer = {
    sendVerification: async () => {},
    sendPasswordReset: async () => {},
    sendWelcome: async () => {},
    sendTest: async (input) => {
      sentMailInputs.push(input);
      const { email } = input;
      sentRecipients.push(email);
    },
  };
  const app = createTestApiApp({
    users: repository,
    settings,
    mailer,
    id: () => `id-${repository.auditEvents.length}`,
    ...(resolveSession ? { resolveSession } : {}),
  });
  const actor = seed.find((user) => user.id === actorId);
  let rpcRequests = 0;
  let lastResponse: Response | undefined;
  const client = createApiClient({
    baseUrl: "http://voidmix.test",
    headers: {
      "x-request-id": "rpc-request-1",
      "x-voidmix-user-id": actorId,
      "x-voidmix-role": role,
      "x-voidmix-email": actor?.email,
      "x-voidmix-display-name": actor?.displayName,
    },
    fetch: async (input, init) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      rpcRequests += new URL(requestUrl).pathname.startsWith("/rpc/") ? 1 : 0;
      lastResponse = await app.fetch(new Request(input, init));
      return lastResponse;
    },
  });
  return {
    repository,
    settings,
    sentRecipients,
    sentMailInputs,
    app,
    client,
    get rpcRequests() {
      return rpcRequests;
    },
    get lastResponse() {
      return lastResponse;
    },
  };
}

describe("API", () => {
  it("returns the stable error envelope for unmatched routes", async () => {
    const app = createTestApiApp();
    const response = await app.request("/missing-route");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: "NOT_FOUND",
      data: { error: { code: "NOT_FOUND" } },
    });
  });

  it("returns an oRPC-compatible stable error for unmatched procedures", async () => {
    const app = createTestApiApp();
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    }) as unknown as { missingProcedure(input: object): Promise<unknown> };

    await expect(client.missingProcedure({})).rejects.toMatchObject({
      code: "NOT_FOUND",
      data: { error: { code: "NOT_FOUND" } },
    });
  });

  it("returns an oRPC-compatible stable error for host failures", async () => {
    const app = createTestApiApp({
      resolveSession: async () => {
        throw new Error("private diagnostic");
      },
    });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(client.health({})).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      data: {
        error: { code: "INTERNAL_SERVER_ERROR" },
        requestId: expect.any(String),
      },
    });
  });

  it("returns the stable error envelope for unhandled host errors", async () => {
    const app = createTestApiApp({
      authHandler: async () => {
        throw new Error("private diagnostic");
      },
    });
    const response = await app.request("/api/auth/get-session");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      data: { error: { code: "INTERNAL_SERVER_ERROR" } },
    });
    expect(body).not.toHaveProperty("message");
  });

  it("mounts the injected auth handler with credentialed CORS", async () => {
    const app = createTestApiApp({
      authHandler: async () => new Response("auth-ok"),
      allowedOrigins: ["http://admin.voidmix.test"],
    });
    const response = await app.request("/api/auth/get-session", {
      headers: { Origin: "http://admin.voidmix.test" },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("auth-ok");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("access-control-allow-origin")).toBe("http://admin.voidmix.test");
  });

  it("allows Accept-Language on cross-origin auth requests", async () => {
    const app = createTestApiApp({ allowedOrigins: ["http://admin.voidmix.test"] });
    const response = await app.request("/api/auth/get-session", {
      method: "OPTIONS",
      headers: {
        Origin: "http://admin.voidmix.test",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Accept-Language",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-headers")).toContain("Accept-Language");
  });

  it("does not advertise test actor headers through production CORS", async () => {
    const app = createTestApiApp({ allowedOrigins: ["http://desktop.voidmix.test"] });
    const response = await app.request("/rpc/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://desktop.voidmix.test",
        "Access-Control-Request-Method": "GET",
      },
    });

    const allowHeaders = response.headers.get("access-control-allow-headers") ?? "";
    expect(allowHeaders).toContain("X-Request-ID");
    expect(allowHeaders).not.toContain("X-Voidmix-User-Id");
    expect(allowHeaders).not.toContain("X-Voidmix-Role");
  });

  it("serves health through Hono and oRPC", async () => {
    const { app, client } = setup("owner", "owner-1");
    expect((await app.request("/health")).status).toBe(200);
    expect((await client.health({})).status).toBe("ok");
  });

  it("serves the authenticated account profile without exposing admin state", async () => {
    const { client } = setup("user", "user-1");
    await expect(client.account.profile.get({})).resolves.toEqual({
      id: "user-1",
      email: "user@example.com",
      displayName: "User",
    });
  });

  it("rejects the account profile when there is no session", async () => {
    const app = createTestApiApp({ resolveSession: async () => null });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(client.account.profile.get({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("generates compact request ids when the client does not provide one", async () => {
    const app = createTestApiApp();
    const response = await app.request("/health");
    const requestId = response.headers.get("x-request-id");

    expect(requestId).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it("batches concurrent safe reads and returns the request id header", async () => {
    const setupResult = setup("owner", "owner-1");
    const [health, user] = await Promise.all([
      setupResult.client.health({}),
      setupResult.client.admin.users.get({ userId: "user-1" }),
    ]);

    expect(health.status).toBe("ok");
    expect(user.id).toBe("user-1");
    expect(setupResult.rpcRequests).toBe(1);
    expect(setupResult.lastResponse?.headers.get("x-request-id")).toBe("rpc-request-1");
  });

  it("resolves the request auth context once for a batched RPC request", async () => {
    let calls = 0;
    const headerResolver = createHeaderSessionResolver();
    const result = setup("owner", "owner-1", true, async (request) => {
      calls += 1;
      return headerResolver(request);
    });

    await Promise.all([
      result.client.health({}),
      result.client.admin.users.get({ userId: "user-1" }),
    ]);

    expect(calls).toBe(1);
  });

  it("does not resolve application auth context for Better Auth routes", async () => {
    let calls = 0;
    const app = createTestApiApp({
      resolveSession: async () => {
        calls += 1;
        return null;
      },
      authHandler: async () => new Response("auth-ok"),
    });

    const response = await app.request("/api/auth/get-session");

    expect(response.status).toBe(200);
    expect(calls).toBe(0);
  });

  it("rejects ordinary users from admin procedures", async () => {
    const { client } = setup("user", "user-1");
    await expect(client.admin.users.list({ limit: 20 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects unauthenticated callers before protected handlers", async () => {
    const app = createTestApiApp({ resolveSession: async () => null });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(client.admin.users.list({ limit: 20 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects GET requests for mutation procedures", async () => {
    const { app } = setup("owner", "owner-1");
    const data = encodeURIComponent(JSON.stringify({ userId: "user-1", status: "suspended" }));
    const response = await app.request(`/rpc/admin/users/updateStatus?data=${data}`, {
      method: "GET",
      headers: {
        "x-voidmix-user-id": "owner-1",
        "x-voidmix-role": "owner",
      },
    });

    // The Fetch handler intentionally leaves a disallowed method unmatched;
    // Hono then returns its ordinary 404 without invoking the mutation.
    expect(response.status).toBe(404);
  });

  it("rejects GET requests for Project Studio mutations", async () => {
    const { app } = setup("owner", "owner-1");
    const data = encodeURIComponent(JSON.stringify({ projectId: "project-1" }));
    const response = await app.request(`/rpc/projects/archive?data=${data}`, {
      method: "GET",
      headers: {
        "x-voidmix-user-id": "owner-1",
        "x-voidmix-role": "owner",
      },
    });

    expect(response.status).toBe(404);
  });

  it("serves workspace assets and Agent runs through typed protected procedures", async () => {
    const assetRepositories: AssetRepositories = createInMemoryAssetRepositories();
    const agentRepositories: AgentRepositories = createInMemoryAgentRepositories();
    const modules = createApiModules({
      users: new InMemoryUserRepository(seed),
      settings: new InMemorySystemSettingsRepository(),
      mailFallback: testMailFallback,
      mailer: testMailer,
      assets: assetRepositories,
      agents: agentRepositories,
      workspaceMemberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-owner-1",
          workspaceId: "workspace-1",
          userId: "owner-1",
          role: "owner",
          status: "active",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
      id: (() => {
        let sequence = 0;
        return () => `domain-${++sequence}`;
      })(),
    });
    const app = createTestApiApp({ modules });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: { "x-voidmix-user-id": "owner-1", "x-voidmix-role": "owner" },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    const asset = await client.workspace.assets.create({
      workspaceId: "workspace-1",
      path: "docs/readme.md",
    });
    expect(asset).toMatchObject({ id: "domain-1", path: "docs/readme.md", status: "active" });
    const run = await client.workspace.agents.runs.create({
      workspaceId: "workspace-1",
      goal: "Index workspace",
    });
    expect(run).toMatchObject({ id: "domain-2", requestedBy: "owner-1", status: "queued" });
    await expect(
      client.workspace.assets.create({ workspaceId: "workspace-1", path: "docs/readme.md" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const nonMemberClient = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: { "x-voidmix-user-id": "user-1", "x-voidmix-role": "user" },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });
    await expect(
      nonMemberClient.workspace.assets.create({
        workspaceId: "workspace-1",
        path: "docs/private.md",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces Blob upload ownership and returns bounded downloads", async () => {
    const users = new InMemoryUserRepository(seed);
    const blobStorage = new InMemoryBlobStorageRepository({
      now: () => studioTimestamp,
      id: () => "upload-1",
    });
    const modules = createApiModules({
      users,
      settings: new InMemorySystemSettingsRepository({ auditEvents: users.auditEvents }),
      mailFallback: testMailFallback,
      mailer: testMailer,
      blobStorage,
      workspaceMemberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-owner-1",
          workspaceId: "workspace-1",
          userId: "owner-1",
          role: "owner",
          status: "active",
          createdAt: studioTimestamp,
          updatedAt: studioTimestamp,
        },
      ]),
    });
    const app = createTestApiApp({ modules });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: {
        "x-voidmix-user-id": "owner-1",
        "x-voidmix-role": "owner",
      },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });
    const blobHash = "fa690b82061edfd2852629aeba8a8977b57e40fcb77d1a7a28b26cba62591204";
    const upload = await client.workspace.assets.upload.create({
      workspaceId: "workspace-1",
      byteSize: 3,
      contentType: "text/plain",
      expectedHash: blobHash,
    });
    await expect(
      client.workspace.assets.upload.complete({
        uploadId: upload.id,
        byteSize: 3,
        contentType: "text/plain",
        blobHash,
        body: Buffer.from("hey").toString("base64"),
      }),
    ).resolves.toMatchObject({ blobHash, byteSize: 3 });
    await expect(
      client.workspace.assets.download.get({ workspaceId: "workspace-1", blobHash }),
    ).resolves.toMatchObject({ body: Buffer.from("hey").toString("base64") });

    const otherClient = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: { "x-voidmix-user-id": "user-1", "x-voidmix-role": "user" },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });
    await expect(
      otherClient.workspace.assets.download.get({ workspaceId: "workspace-1", blobHash }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("serves Project Studio procedures through the injected service port", async () => {
    const service = createStudioService({
      getProject: async () => studioProject,
      listProjects: async () => ({ items: [studioProject], nextCursor: null }),
      getSnapshot: async ({ actorId }) => ({
        account: {
          id: actorId,
          email: "owner@example.com",
          displayName: "Owner",
          workspaceIds: ["workspace-1"],
        },
        projects: [studioProject],
        reviewAttention: [],
        recentActivity: [],
        activeSessions: [],
        nextProjectsCursor: null,
      }),
    });
    const repository = new InMemoryUserRepository(seed);
    const modules = createApiModules({
      users: repository,
      settings: new InMemorySystemSettingsRepository(),
      mailFallback: testMailFallback,
      mailer: testMailer,
      studio: service,
      workspaceMemberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-owner-1",
          workspaceId: "workspace-1",
          userId: "owner-1",
          role: "owner",
          status: "active",
          createdAt: studioTimestamp,
          updatedAt: studioTimestamp,
        },
      ]),
    });
    const app = createTestApiApp({ modules });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: {
        "x-voidmix-user-id": "owner-1",
        "x-voidmix-role": "owner",
        "x-voidmix-email": "owner@example.com",
        "x-voidmix-display-name": "Owner",
      },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(client.studio.snapshot.get({})).resolves.toMatchObject({
      projects: [{ id: "project-1" }],
    });
    await expect(client.projects.list({})).resolves.toMatchObject({
      items: [{ id: "project-1" }],
    });
    await expect(client.projects.get({ projectId: "project-1" })).resolves.toMatchObject({
      id: "project-1",
    });
  });

  it("persists the Pi session lifecycle through the API", async () => {
    const timestamp = new Date("2026-09-09T00:00:00.000Z");
    const repositories = createInMemoryProjectStudioRepositories({
      id: (() => {
        let sequence = 0;
        return () => `studio-${++sequence}`;
      })(),
      now: () => timestamp,
    });
    const agentRepositories = createInMemoryAgentRepositories();
    const users = new InMemoryUserRepository(seed);
    let idSequence = 0;
    const modules = createApiModules({
      users,
      settings: new InMemorySystemSettingsRepository({ auditEvents: users.auditEvents }),
      mailFallback: testMailFallback,
      mailer: testMailer,
      projects: new InMemoryProjectRepository([
        {
          id: "project-1",
          name: "Launch film",
          description: "A film",
          status: "active",
          ownerId: "owner-1",
          workspaceId: "workspace-1",
          stage: "draft",
          archived: false,
          archivedAt: null,
          previousStage: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]),
      workspaceMemberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-1",
          workspaceId: "workspace-1",
          userId: "owner-1",
          role: "owner",
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]),
      agents: agentRepositories,
      projectStudioRepositories: repositories,
      id: () => `studio-${++idSequence}`,
    });
    const app = createTestApiApp({ modules });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: {
        "x-voidmix-user-id": "owner-1",
        "x-voidmix-role": "owner",
        "x-voidmix-email": "owner@example.com",
        "x-voidmix-display-name": "Owner",
      },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    const created = await client.pi.sessions.create({
      projectId: "project-1",
      prompt: "Prepare the launch brief",
      context: { source: "integration-test" },
      idempotencyKey: "pi-create-1",
    });
    expect(created).toMatchObject({
      id: "studio-1",
      projectId: "project-1",
      status: "queued",
      context: { source: "integration-test" },
      run: { status: "queued" },
    });

    await expect(client.pi.sessions.get({ sessionId: created.id })).resolves.toMatchObject({
      id: created.id,
      run: { runId: created.agentRunId },
    });

    const cancelled = await client.pi.sessions.cancel({ sessionId: created.id });
    expect(cancelled).toMatchObject({ status: "cancelled", run: { status: "cancelled" } });

    const retried = await client.pi.sessions.retry({
      sessionId: created.id,
      idempotencyKey: "pi-retry-1",
    });
    expect(retried).toMatchObject({
      id: created.id,
      agentRunId: "studio-2",
      status: "queued",
      completedAt: null,
      run: { runId: "studio-2", status: "queued" },
    });
  });

  it("rejects Project Studio calls when the module is not configured", async () => {
    const result = setup("owner", "owner-1");

    await expect(result.client.projects.list({})).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(result.lastResponse?.status).toBe(500);
  });

  it("checks the resource workspace before Project Studio mutations", async () => {
    const service = createStudioService({
      getProject: async () => ({ ...studioProject, workspaceId: "workspace-2" }),
    });
    const modules = createApiModules({
      users: new InMemoryUserRepository(seed),
      settings: new InMemorySystemSettingsRepository(),
      mailFallback: testMailFallback,
      mailer: testMailer,
      studio: service,
      workspaceMemberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-owner-1",
          workspaceId: "workspace-1",
          userId: "owner-1",
          role: "owner",
          status: "active",
          createdAt: studioTimestamp,
          updatedAt: studioTimestamp,
        },
      ]),
    });
    const app = createTestApiApp({ modules });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: {
        "x-voidmix-user-id": "owner-1",
        "x-voidmix-role": "owner",
        "x-voidmix-email": "owner@example.com",
        "x-voidmix-display-name": "Owner",
      },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(client.projects.get({ projectId: "project-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("maps Project domain errors to typed RPC errors", async () => {
    const service = createStudioService({
      getProject: async () => studioProject,
      updateProject: async () => {
        throw new ProjectDomainError(
          "PROJECT_INVALID_STAGE_TRANSITION",
          "Project stage cannot change from draft to delivered.",
        );
      },
    });
    const modules = createApiModules({
      users: new InMemoryUserRepository(seed),
      settings: new InMemorySystemSettingsRepository(),
      mailFallback: testMailFallback,
      mailer: testMailer,
      studio: service,
      workspaceMemberships: new InMemoryWorkspaceMembershipRepository([
        {
          id: "membership-owner-1",
          workspaceId: "workspace-1",
          userId: "owner-1",
          role: "owner",
          status: "active",
          createdAt: studioTimestamp,
          updatedAt: studioTimestamp,
        },
      ]),
    });
    const app = createTestApiApp({ modules });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: {
        "x-voidmix-user-id": "owner-1",
        "x-voidmix-role": "owner",
        "x-voidmix-email": "owner@example.com",
        "x-voidmix-display-name": "Owner",
      },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(
      client.projects.update({ projectId: "project-1", stage: "delivered" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects unauthenticated workspace procedures", async () => {
    const app = createTestApiApp({ resolveSession: async () => null });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(
      client.workspace.assets.create({ workspaceId: "workspace-1", path: "docs/readme.md" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("uses explicitly injected business modules", async () => {
    const users = new InMemoryUserRepository(seed);
    const settings = new InMemorySystemSettingsRepository();
    const modules = createApiModules({
      users,
      settings,
      mailFallback: testMailFallback,
      mailer: testMailer,
    });
    const expected = { ...seed[2]!, displayName: "Injected module" };
    modules.users.get = async () => expected;
    const app = createTestApiApp({ modules });
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      headers: {
        "x-voidmix-user-id": "owner-1",
        "x-voidmix-role": "owner",
      },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(client.admin.users.get({ userId: "user-1" })).resolves.toEqual(expected);
  });

  it("rejects ordinary users from every mail settings procedure", async () => {
    const { client } = setup("user", "user-1");
    await expect(client.admin.settings.mail.get({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      client.admin.settings.mail.update({
        from: { action: "set", value: "mail@example.com" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(client.admin.settings.mail.sendTest({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects ordinary users from every auth settings procedure", async () => {
    const { client } = setup("user", "user-1");
    await expect(client.admin.settings.auth.get({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      client.admin.settings.auth.update({
        registrationMode: { action: "set", value: "closed" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets admins read auth policy but reserves writes for owners", async () => {
    const { client } = setup("admin", "admin-1");
    await expect(client.admin.settings.auth.get({})).resolves.toMatchObject({
      registrationMode: "open",
    });
    await expect(
      client.admin.settings.auth.update({
        registrationMode: { action: "set", value: "closed" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets owners update typed auth policy with durable redacted audit metadata", async () => {
    const { client, repository } = setup("owner", "owner-1");
    const updated = await client.admin.settings.auth.update({
      registrationMode: { action: "set", value: "closed" },
      allowedEmailDomains: {
        action: "set",
        value: [" Example.COM ", "studio.example"],
      },
      welcomeEmailEnabled: { action: "set", value: false },
      passwordResetEmailEnabled: { action: "set", value: false },
    });

    expect(updated).toMatchObject({
      registrationMode: "closed",
      allowedEmailDomains: ["example.com", "studio.example"],
      welcomeEmailEnabled: false,
      passwordResetEmailEnabled: false,
    });
    expect(repository.auditEvents).toHaveLength(1);
    expect(repository.auditEvents[0]).toMatchObject({
      action: "system.settings.updated",
      targetType: "system_setting",
      targetId: "auth",
      metadata: { result: "updated" },
    });
    expect(repository.auditEvents[0]?.metadata.operations).toContain("auth.registration_mode:set");
    expect(JSON.stringify(repository.auditEvents)).not.toContain("example.com");
    expect(JSON.stringify(repository.auditEvents)).not.toContain('"closed"');
  });

  it.each(["admin", "owner"] as const)("lets %s manage and test mail settings", async (role) => {
    const actorId = role === "admin" ? "admin-1" : "owner-1";
    const { client, settings, sentRecipients, repository } = setup(role, actorId);
    const before = await client.admin.settings.mail.get({});
    expect(before).toMatchObject({
      configurationState: "ready",
      resendApiKey: { configured: true, source: "database" },
    });
    expect(before.resendApiKey).not.toHaveProperty("value");
    expect(JSON.stringify(before)).not.toContain("database-key");

    await client.admin.settings.mail.update({
      from: { action: "set", value: "updated@example.com" },
      fromName: { action: "set", value: "Updated sender" },
      templatesBaseUrl: { action: "set", value: "https://mail.example.com" },
    });
    expect(settings.secrets.get("mail.resend_api_key")?.value).toBe("database-key");

    const result = await client.admin.settings.mail.sendTest({});
    expect(result.recipient).toBe(seed.find((user) => user.id === actorId)?.email);
    expect(sentRecipients).toEqual([result.recipient]);
    expect(repository.auditEvents.at(-1)).toMatchObject({
      action: "system.mail.test.sent",
      targetType: "system_setting",
      targetId: "mail",
      metadata: { recipient: result.recipient, result: "sent" },
    });
    expect(JSON.stringify(repository.auditEvents)).not.toContain("database-key");
  });

  it("preserves the mailer's configured default when the request has no locale hint", async () => {
    const { client, sentMailInputs } = setup("owner", "owner-1");

    await client.admin.settings.mail.sendTest({});

    expect(sentMailInputs).toEqual([
      {
        email: "owner@example.com",
        name: "Owner",
      },
    ]);
  });

  it("serves only derived auth capabilities without a session", async () => {
    const { app } = setup("owner", "owner-1");
    const client = createApiClient({
      baseUrl: "http://voidmix.test",
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    });

    await expect(client.public.auth.capabilities.get({})).resolves.toEqual({
      registrationAvailable: true,
      verificationEmailRequestAvailable: true,
      passwordResetRequestAvailable: true,
    });
  });

  it("recomputes public auth capabilities from current policy and mail readiness", async () => {
    const ready = setup("owner", "owner-1");
    const publicClient = createApiClient({
      baseUrl: "http://voidmix.test",
      fetch: async (input, init) => ready.app.fetch(new Request(input, init)),
    });

    await ready.client.admin.settings.auth.update({
      registrationMode: { action: "set", value: "closed" },
      verificationEmailEnabled: { action: "set", value: false },
      passwordResetEmailEnabled: { action: "set", value: false },
    });
    await expect(publicClient.public.auth.capabilities.get({})).resolves.toEqual({
      registrationAvailable: false,
      verificationEmailRequestAvailable: false,
      passwordResetRequestAvailable: false,
    });

    const incomplete = setup("owner", "owner-1", false);
    const incompletePublicClient = createApiClient({
      baseUrl: "http://voidmix.test",
      fetch: async (input, init) => incomplete.app.fetch(new Request(input, init)),
    });
    await expect(incompletePublicClient.public.auth.capabilities.get({})).resolves.toEqual({
      registrationAvailable: false,
      verificationEmailRequestAvailable: false,
      passwordResetRequestAvailable: false,
    });
  });

  it("returns MAIL_NOT_CONFIGURED with HTTP 503 when testing without mail settings", async () => {
    const result = setup("owner", "owner-1", false);
    await expect(result.client.admin.settings.mail.sendTest({})).rejects.toMatchObject({
      code: "MAIL_NOT_CONFIGURED",
    });
    expect(result.lastResponse?.status).toBe(503);
    expect(result.sentRecipients).toEqual([]);
  });

  it("updates a user and writes an audit event", async () => {
    const { client, repository } = setup("owner", "owner-1");
    const updated = await client.admin.users.updateStatus({
      userId: "user-1",
      status: "suspended",
    });

    expect(updated.status).toBe("suspended");
    expect(repository.auditEvents).toHaveLength(1);
    expect((await client.admin.audit.list({ limit: 10 }))[0]).toMatchObject({
      actorId: "owner-1",
      targetId: "user-1",
      action: "user.status.changed",
    });
  });

  it("prevents self-suspension", async () => {
    const { client } = setup("owner", "owner-1");
    await expect(
      client.admin.users.updateStatus({ userId: "owner-1", status: "suspended" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("emits one Hono event and one enriched oRPC admin event", async () => {
    const events: Record<string, unknown>[] = [];
    configureLogger({
      service: "api-test",
      environment: "test",
      pretty: false,
      silent: true,
      drain: async (context) => {
        events.push(context.event);
      },
    });
    const { app, client } = setup("owner", "owner-1");
    await app.request("/health", {
      headers: {
        "x-request-id": "health-request-1",
        "x-voidmix-user-id": "spoofed-user",
      },
    });
    await client.admin.users.updateStatus({
      userId: "user-1",
      status: "suspended",
    });

    const healthEvents = events.filter((event) => event.path === "/health");
    const rpcEvents = events.filter((event) => event.operation === "admin.users.updateStatus");

    expect(events).toHaveLength(2);
    expect(healthEvents).toHaveLength(1);
    expect(healthEvents[0]).toMatchObject({
      operation: "/health",
      requestId: "health-request-1",
      permissionResult: "not_checked",
      service: "api",
      status: 200,
    });
    expect(rpcEvents).toHaveLength(1);
    expect(rpcEvents[0]).toMatchObject({
      requestId: "rpc-request-1",
      operation: "admin.users.updateStatus",
      user: { id: "owner-1", role: "owner" },
      permission: { name: "admin.users.write" },
      permissionResult: "granted",
      service: "api",
      actor: { type: "user", id: "owner-1" },
      target: { type: "user", id: "user-1" },
      outcome: "success",
      status: 200,
    });
  });
});
