import { createApiClient } from "@voidmix/client";
import { InMemoryUserRepository } from "@voidmix/db";
import type { User } from "@voidmix/domain";
import { configureLogger } from "@voidmix/logger";
import { describe, expect, it } from "vite-plus/test";

import { createApiApp } from "./app.js";

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
    id: "user-1",
    email: "user@example.com",
    displayName: "User",
    role: "user",
    status: "active",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

function setup(role: "user" | "owner", actorId: string) {
  const repository = new InMemoryUserRepository(seed);
  const app = createApiApp({ users: repository, id: () => `id-${repository.auditEvents.length}` });
  let rpcRequests = 0;
  let lastResponse: Response | undefined;
  const client = createApiClient({
    baseUrl: "http://voidmix.test",
    headers: {
      "x-request-id": "rpc-request-1",
      "x-voidmix-user-id": actorId,
      "x-voidmix-role": role,
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
  it("mounts the injected auth handler with credentialed CORS", async () => {
    const app = createApiApp({
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

  it("serves health through Hono and oRPC", async () => {
    const { app, client } = setup("owner", "owner-1");
    expect((await app.request("/health")).status).toBe(200);
    expect((await client.health({})).status).toBe("ok");
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

  it("rejects ordinary users from admin procedures", async () => {
    const { client } = setup("user", "user-1");
    await expect(client.admin.users.list({ limit: 20 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
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
    await app.request("/health", { headers: { "x-request-id": "health-request-1" } });
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
