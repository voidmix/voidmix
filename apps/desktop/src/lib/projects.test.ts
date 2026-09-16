import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const api = vi.hoisted(() => ({ projects: { list: vi.fn(), get: vi.fn(), create: vi.fn() } }));
vi.mock("@voidmix/client", () => ({ createApiClient: () => api }));
vi.mock("../env", () => ({ env: { VITE_API_URL: "https://api.example.test" } }));

import { loadProject, loadProjects } from "./projects";

beforeEach(() => vi.resetAllMocks());

describe("project route transport", () => {
  it("passes route cancellation to both project reads", async () => {
    const { signal } = new AbortController();
    api.projects.list.mockResolvedValue({ items: [] });
    api.projects.get.mockResolvedValue({ project: null });
    await expect(loadProjects(signal)).resolves.toEqual({ status: "loaded", data: [] });
    await expect(loadProject("missing", signal)).resolves.toEqual({ status: "loaded", data: null });
    expect(api.projects.list).toHaveBeenCalledWith({}, { signal });
    expect(api.projects.get).toHaveBeenCalledWith({ projectId: "missing" }, { signal });
  });

  it("propagates cancelled reads instead of presenting them as unavailable", async () => {
    const controller = new AbortController();
    const reason = new Error("Route left");
    controller.abort(reason);
    api.projects.list.mockRejectedValue(reason);
    api.projects.get.mockRejectedValue(reason);
    await expect(loadProjects(controller.signal)).rejects.toBe(reason);
    await expect(loadProject("old", controller.signal)).rejects.toBe(reason);
  });

  it("preserves the unavailable state for actual API failures", async () => {
    api.projects.list.mockRejectedValue(new Error("offline"));
    api.projects.get.mockRejectedValue(new Error("offline"));
    await expect(loadProjects()).resolves.toEqual({ status: "unavailable", data: null });
    await expect(loadProject("project-1")).resolves.toEqual({ status: "unavailable", data: null });
  });
});
