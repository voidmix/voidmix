import { test as base, type Page, type Route } from "@playwright/test";

const workspaceId = "workspace-e2e";
const projectId = "project-e2e";
const now = new Date("2026-09-09T00:00:00.000Z");

const project = {
  id: projectId,
  workspaceId,
  ownerId: "user-e2e",
  title: "E2E Launch Film",
  description: "A focused brief for the launch film.",
  cover: null,
  thumbnail: null,
  stage: "in_progress",
  archived: false,
  archivedAt: null,
  stageWasDefaulted: false,
  progress: 0,
  deadline: null,
  lastActivityAt: now,
  createdAt: now,
  updatedAt: now,
};

const task = {
  id: "task-e2e",
  projectId,
  title: "Approve storyboard",
  status: "todo",
  createdBy: "user-e2e",
  updatedAt: now,
};

const member = {
  id: "member-e2e",
  projectId,
  workspaceId,
  userId: "user-e2e",
  role: "owner",
  status: "active",
  createdAt: now,
  updatedAt: now,
};

function serializeRpc(value: unknown) {
  const meta: Array<Array<string | number>> = [];

  function visit(input: unknown, path: Array<string | number>): unknown {
    if (input instanceof Date) {
      meta.push(["date", ...path]);
      return input.toISOString();
    }
    if (Array.isArray(input)) return input.map((item, index) => visit(item, [...path, index]));
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input).map(([key, item]) => [key, visit(item, [...path, key])]),
      );
    }
    return input;
  }

  return { json: visit(value, []), ...(meta.length ? { meta } : {}) };
}

function projectDetail() {
  return {
    ...project,
    brief: project.description,
    tasks: [task],
    members: [member],
    assetReferences: [],
    reviews: [],
    sessions: [],
  };
}

async function fulfillRpc(route: Route, output: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(serializeRpc(output)),
  });
}

async function mockProjectStudioApi(page: Page) {
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: "e2e-session",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: "session-e2e",
          userId: "user-e2e",
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        },
        user: {
          id: "user-e2e",
          name: "E2E User",
          email: "e2e@example.com",
          role: "user",
          status: "active",
        },
      }),
    }),
  );

  await page.route("**/rpc/**", async (route) => {
    const requestUrl = route.request().url();
    const path = new URL(requestUrl).pathname;
    if (path.endsWith("/studio/snapshot/get")) {
      await fulfillRpc(route, {
        account: {
          id: "user-e2e",
          email: "e2e@example.com",
          displayName: "E2E User",
          workspaceIds: [workspaceId],
        },
        projects: [project],
        reviewAttention: [],
        recentActivity: [],
        activeSessions: [],
        nextProjectsCursor: null,
      });
      return;
    }
    if (path.endsWith("/projects/get")) {
      await fulfillRpc(route, projectDetail());
      return;
    }
    if (path.endsWith("/library/search")) {
      await fulfillRpc(route, { assets: [], versions: [], projects: [project], nextCursor: null });
      return;
    }
    if (path.endsWith("/__batch__") || requestUrl.includes("library/search")) {
      const requestBody = route.request().postData();
      const data =
        new URL(requestUrl).searchParams.get("data") ??
        (requestBody && requestBody.startsWith("{")
          ? ((JSON.parse(requestBody) as { data?: string }).data ?? null)
          : null);
      const requests = data
        ? (JSON.parse(data) as Array<{ id: string; json: { url: string } }>)
        : [];
      const messages = requests.map((request) => {
        const body = request.json.url.includes("/library/search")
          ? { assets: [], versions: [], projects: [project], nextCursor: null }
          : projectDetail();
        return {
          id: request.id,
          kind: "response",
          json: { body: serializeRpc(body) },
        };
      });
      await route.fulfill({
        status: 207,
        contentType: "application/json",
        body: JSON.stringify(messages),
      });
      return;
    }
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await mockProjectStudioApi(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
