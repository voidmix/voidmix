import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  return {
    close,
    createApiRuntime: vi.fn(async () => ({
      app: { fetch: vi.fn() },
      close,
    })),
  };
});

vi.hoisted(() => {
  process.env.AUTH_URL = "http://localhost:3002";
  process.env.DATABASE_URL = "postgres://voidmix:test@example.invalid:5432/voidmix";
});

vi.mock("@voidmix/api-runtime", () => ({
  createApiRuntime: mocks.createApiRuntime,
}));

describe("standalone API runtime host", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("creates one shared runtime and closes it through the host lifecycle", async () => {
    const { closeApiRuntime, getApiRuntime } = await import("./runtime.js");

    const first = await getApiRuntime();
    const second = await getApiRuntime();
    await closeApiRuntime();

    expect(first).toBe(second);
    expect(mocks.createApiRuntime).toHaveBeenCalledOnce();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
