import { describe, expect, it } from "vite-plus/test";

import { createApiClient } from "./index.js";

describe("createApiClient", () => {
  it("creates a typed lazy client without making a request", () => {
    const client = createApiClient({ baseUrl: "https://api.example.com/" });
    expect(client.admin.users.list).toBeTypeOf("function");
  });

  it("supports a relative same-origin transport", () => {
    const client = createApiClient();
    expect(client.health).toBeTypeOf("function");
  });

  it("uses POST for mutations so they cannot enter GET batching", async () => {
    const methods: string[] = [];
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetch: async (input, init) => {
        methods.push(new Request(input, init).method);
        return new Response("{}", {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      },
    });

    await expect(
      client.workspace.agents.runs.transition({ runId: "run-1", status: "running" }),
    ).rejects.toBeDefined();
    expect(methods).toEqual(["POST"]);
  });

  it("uses POST for Project Studio mutations", async () => {
    const methods: string[] = [];
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetch: async (input, init) => {
        methods.push(new Request(input, init).method);
        return new Response("{}", {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const calls = [
      client.projects.archive({ projectId: "project-1" }),
      client.projects.restore({ projectId: "project-1" }),
      client.reviews.resolve({ reviewId: "review-1" }),
      client.pi.sessions.cancel({ sessionId: "session-1" }),
      client.pi.sessions.retry({ sessionId: "session-1", idempotencyKey: "retry-1" }),
    ];
    await Promise.all(calls.map((call) => call.catch(() => undefined)));

    expect(methods).toEqual(["POST", "POST", "POST", "POST", "POST"]);
  });
});
