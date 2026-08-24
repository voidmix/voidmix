import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const fetch = vi.fn(async () => new Response("ok"));
  return {
    close,
    fetch,
    createApiRuntime: vi.fn(async () => ({ app: { fetch }, close })),
  };
});

vi.hoisted(() => {
  process.env.AUTH_URL = "http://localhost:3000";
  process.env.DATABASE_URL = "postgres://voidmix:test@example.invalid:5432/voidmix";
});

vi.mock("@voidmix/api-runtime", () => ({
  createApiRuntime: mocks.createApiRuntime,
}));

vi.mock("@voidmix/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), emit: vi.fn() })),
}));

describe("Web API runtime host", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("creates one runtime and closes the same instance", async () => {
    const { closeWebApiRuntime, getWebApiRuntime } = await import("./runtime.js");

    const first = await getWebApiRuntime();
    const second = await getWebApiRuntime();
    await closeWebApiRuntime();

    expect(first).toBe(second);
    expect(mocks.createApiRuntime).toHaveBeenCalledOnce();
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it("forwards Nitro Web requests to Hono", async () => {
    const { default: handler } = await import("./handler.js");
    const request = new Request("http://localhost:3000/health");

    const response = await handler.fetch(request);

    expect(await response.text()).toBe("ok");
    expect(mocks.fetch).toHaveBeenCalledWith(request);
  });
});
