/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { I18nProvider } from "@voidmix/i18n/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ReactNode } from "react";

import { messages } from "./i18n/messages";
import { demoCloudSnapshot } from "./lib/cloud/demo";
import { getRouter } from "./router";
import { useDesktopPreferences } from "./lib/preferences";
import { Route as rootRoute } from "./routes/__root";

const loaders = vi.hoisted(() => ({
  loadProjects: vi.fn(),
  loadProject: vi.fn(),
  createProject: vi.fn(),
  loadCloudSnapshot: vi.fn(),
}));

function project(id: string, title: string) {
  return { id, title, description: "A focused brief", stage: "draft" };
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

vi.mock("./lib/projects", () => loaders);
vi.mock("./lib/cloud", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/cloud")>()),
  loadCloudSnapshot: loaders.loadCloudSnapshot,
}));
vi.mock("./env", () => ({ env: {} }));

function renderRoute(path: string) {
  const router = getRouter();
  // Exercise the real route tree inside jsdom; the Start build owns the HTML document.
  Object.assign(rootRoute.options, {
    shellComponent: ({ children }: { children: ReactNode }) => children,
  });
  router.update({
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
  render(
    <I18nProvider locale="en" messages={messages}>
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return router;
}

beforeEach(() => {
  vi.resetAllMocks();
  useDesktopPreferences.setState(useDesktopPreferences.getInitialState(), true);
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  loaders.loadProjects.mockResolvedValue({ status: "loaded", data: [] });
  loaders.loadProject.mockResolvedValue({
    status: "loaded",
    data: project("project-1", "Launch film"),
  });
  loaders.loadCloudSnapshot.mockResolvedValue({ snapshot: demoCloudSnapshot, source: "demo" });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Desktop Start routes", () => {
  it("keeps titlebar and settings theme controls synchronized", async () => {
    renderRoute("/settings");
    await screen.findByRole("heading", { name: "Settings" });
    fireEvent.click(screen.getAllByRole("button", { name: "Light" })[1]!);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Dark" })).toHaveLength(2));
    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.click(screen.getAllByRole("button", { name: "Dark" })[0]!);
    expect(screen.getAllByRole("button", { name: "Light" })).toHaveLength(2);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps settings after switching language and leaving the page", async () => {
    const router = renderRoute("/settings");
    const setting = await screen.findByRole("switch", {
      name: messages.en.settings.startWithSystem,
    });
    fireEvent.click(setting);
    fireEvent.click(screen.getByRole("button", { name: "Simplified Chinese" }));
    expect(
      (
        await screen.findByRole("switch", { name: messages.zh.settings.startWithSystem })
      ).getAttribute("aria-checked"),
    ).toBe("true");
    await act(() => router.navigate({ to: "/" }));
    await act(() => router.navigate({ to: "/settings" }));
    expect(
      (
        await screen.findByRole("switch", { name: messages.zh.settings.startWithSystem })
      ).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("keeps the sync pause preference after returning to the overview", async () => {
    const router = renderRoute("/");
    fireEvent.click(await screen.findByRole("button", { name: "Pause sync" }));
    await act(() => router.navigate({ to: "/settings" }));
    await act(() => router.navigate({ to: "/" }));
    expect(await screen.findByRole("button", { name: "Resume sync" })).toBeDefined();
    expect(useDesktopPreferences.getState().syncPaused).toBe(true);
  });

  it("opens project details without rendering the project list over them", async () => {
    renderRoute("/projects/project-1");

    expect(await screen.findByRole("heading", { name: "Launch film" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Projects" })).toBeNull();
  });

  it("renders a missing project through the route's not-found boundary", async () => {
    loaders.loadProject.mockResolvedValue({ status: "loaded", data: null });
    renderRoute("/projects/missing");
    expect(await screen.findByRole("heading", { name: "Project not found" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Back to projects" }).getAttribute("href")).toBe(
      "/projects",
    );
  });

  it("shows route pending UI until project data is ready", async () => {
    const pending = deferred<{ status: "loaded"; data: [] }>();
    loaders.loadProjects.mockReturnValue(pending.promise);
    renderRoute("/projects");
    expect(await screen.findByRole("status")).toBeDefined();
    await act(async () => pending.resolve({ status: "loaded", data: [] }));
    expect(await screen.findByRole("heading", { name: "Projects" })).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps an old project response from replacing a later navigation", async () => {
    const first = deferred<{ status: "loaded"; data: ReturnType<typeof project> }>();
    loaders.loadProject.mockImplementation((id: string) =>
      id === "first"
        ? first.promise
        : Promise.resolve({ status: "loaded", data: project("second", "Second project") }),
    );
    const router = renderRoute("/projects/first");
    await waitFor(() => expect(loaders.loadProject).toHaveBeenCalled());
    const firstSignal = loaders.loadProject.mock.calls[0]?.[1] as AbortSignal;

    await act(() =>
      router.navigate({ to: "/projects/$projectId", params: { projectId: "second" } }),
    );
    expect(await screen.findByRole("heading", { name: "Second project" })).toBeDefined();
    expect(firstSignal.aborted).toBe(true);
    await act(async () =>
      first.resolve({ status: "loaded", data: project("first", "First project") }),
    );
    expect(screen.queryByRole("heading", { name: "First project" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Second project" })).toBeDefined();
  });

  it("reloads the project list after creation", async () => {
    renderRoute("/projects");
    await screen.findByRole("heading", { name: "Projects" });
    fireEvent.click(screen.getByRole("button", { name: "New project" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New film" } });
    loaders.createProject.mockResolvedValue(project("new", "New film"));
    loaders.loadProjects.mockResolvedValue({
      status: "loaded",
      data: [project("new", "New film")],
    });
    fireEvent.submit(input.closest("form")!);

    expect(await screen.findByRole("heading", { name: "New film" })).toBeDefined();
    expect(loaders.createProject).toHaveBeenCalledWith("New film");
    expect(loaders.loadProjects).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("retains the creation form and reports rejected writes", async () => {
    renderRoute("/projects");
    await screen.findByRole("heading", { name: "Projects" });
    fireEvent.click(screen.getByRole("button", { name: "New project" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New film" } });
    loaders.createProject.mockRejectedValue(new Error("offline"));
    fireEvent.submit(input.closest("form")!);
    expect(await screen.findByRole("alert")).toBeDefined();
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("New film");
    expect(loaders.loadProjects).toHaveBeenCalledTimes(1);
  });

  it("refreshes the overview through its route loader", async () => {
    renderRoute("/");
    await screen.findByRole("heading", { name: messages.en.overview.title });
    loaders.loadCloudSnapshot.mockResolvedValue({
      snapshot: { ...demoCloudSnapshot, fileCount: 123456 },
      source: "cloud",
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("123,456")).toBeDefined();
    expect(loaders.loadCloudSnapshot).toHaveBeenCalledTimes(2);
  });

  it("uses the cloud route data on the devices page", async () => {
    loaders.loadCloudSnapshot.mockResolvedValue({
      snapshot: {
        ...demoCloudSnapshot,
        devices: demoCloudSnapshot.devices.map((device) => ({
          ...device,
          name: "Remote workstation",
        })),
      },
      source: "cloud",
    });
    renderRoute("/devices");
    expect((await screen.findAllByText("Remote workstation")).length).toBe(
      demoCloudSnapshot.devices.length,
    );
  });

  it("restores activity filters from navigation history", async () => {
    const router = renderRoute("/activity?filter=downloads");
    expect(await screen.findByText(messages.en.activity.productResearch)).toBeDefined();
    expect(screen.queryByText(messages.en.activity.campaignExports)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Uploads" }));
    expect(await screen.findByText(messages.en.activity.campaignExports)).toBeDefined();
    expect(router.state.location.search).toMatchObject({ filter: "uploads" });
    await act(async () => router.history.back());
    expect(await screen.findByText(messages.en.activity.productResearch)).toBeDefined();
    expect(screen.queryByText(messages.en.activity.campaignExports)).toBeNull();
  });

  it("recovers a route loader error when retried", async () => {
    loaders.loadProjects.mockRejectedValueOnce(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderRoute("/projects");
    expect(await screen.findByRole("alert")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Projects" })).toBeDefined();
    expect(loaders.loadProjects).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
