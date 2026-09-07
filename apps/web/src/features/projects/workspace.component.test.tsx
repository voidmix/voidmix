/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import messages from "../../../messages/en.json";
import { CleanHome } from "../home/clean-home";
import { PiPage } from "../pi/pi-page";
import { createPreviewAdapter } from "./preview-adapter";
import { ProjectPage } from "./project-page";
import { WorkspaceDataProvider } from "./workspace-data";
import { resetWorkspaceShell } from "./workspace-shell-store";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: unknown;
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      data-search={search ? JSON.stringify(search) : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  useNavigate: () => navigate,
}));
vi.mock("../../lib/auth-client", () => ({
  useSession: () => ({ data: null, isPending: false }),
  signOut: vi.fn(),
}));
vi.mock("../../components/language-switcher", () => ({
  LanguageSwitcher: () => <button type="button">Language</button>,
}));
vi.mock("../../components/theme-switcher", () => ({
  ThemeSwitcher: () => <button type="button">Theme</button>,
}));
vi.mock("../home/components/login-button", () => ({
  LoginButton: () => <button type="button">Sign in</button>,
}));
vi.mock("@voidmix/i18n/client", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    let message = (messages.workspaceUi as Record<string, string>)[key] ?? key;
    for (const [name, value] of Object.entries(values ?? {}))
      message = message.replace(`{${name}}`, String(value));
    return message;
  },
}));

beforeEach(() => {
  sessionStorage.clear();
  navigate.mockReset();
  resetWorkspaceShell();
});
afterEach(cleanup);

describe("Clean Signal workspace", () => {
  it("shows one command entry, three templates and real project destinations", async () => {
    render(
      <WorkspaceDataProvider source={createPreviewAdapter()}>
        <CleanHome />
      </WorkspaceDataProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "What will you move forward?" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Ask Voidmix" })).toBeVisible();
    for (const name of ["Draft a brief", "Summarize feedback", "Plan next steps"])
      expect(screen.getByRole("button", { name })).toBeVisible();
    expect(screen.getByRole("link", { name: "View all projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByText("Recent activity").closest("details")).not.toHaveAttribute("open");
  });
  it("binds the command to a selected project without executing it", async () => {
    const source = createPreviewAdapter();
    render(
      <WorkspaceDataProvider source={source}>
        <CleanHome />
      </WorkspaceDataProvider>,
    );
    await screen.findByRole("textbox", { name: "Ask Voidmix" });
    fireEvent.change(screen.getByRole("combobox", { name: "Project context" }), {
      target: { value: "campaign" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Ask Voidmix" }), {
      target: { value: "Launch a campaign" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue with Pi" }));
    expect(source.getSnapshot().sessions[0]).toMatchObject({
      projectId: "campaign",
      status: "idle",
    });
    expect(navigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/pi/$sessionId",
      params: { projectId: "campaign", sessionId: expect.any(String) },
    });
  });
  it("offers an actionable empty state and disables Pi without a project", async () => {
    const source = createPreviewAdapter({
      version: 1,
      projects: [],
      tasks: [],
      activity: [],
      sessions: [],
    });
    render(
      <WorkspaceDataProvider source={source}>
        <CleanHome />
      </WorkspaceDataProvider>,
    );
    await screen.findByText("Make room for your next idea");
    expect(screen.getByRole("link", { name: "Create project" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Ask Voidmix" })).toBeDisabled();
  });
  it("shows loading and retryable data errors", async () => {
    const source = createPreviewAdapter();
    vi.spyOn(source, "hydrate")
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValue(undefined);
    render(
      <WorkspaceDataProvider source={source}>
        <ProjectPage projectId="northstar" tab="overview" filter="all" />
      </WorkspaceDataProvider>,
    );
    expect(screen.getByRole("status", { name: "Loading your workspace…" })).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your workspace could not be loaded",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "Northstar / Launch film" });
  });
  it("updates and undoes task status from the project task list", async () => {
    const source = createPreviewAdapter();
    render(
      <WorkspaceDataProvider source={source}>
        <ProjectPage projectId="northstar" tab="tasks" filter="all" />
      </WorkspaceDataProvider>,
    );
    const done = await screen.findByRole("button", { name: "Done: Approve final color pass" });
    fireEvent.click(done);
    expect(source.getSnapshot().tasks[0]?.status).toBe("done");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(source.getSnapshot().tasks[0]?.status).toBe("blocked");
  });
  it("keeps a quick status update when the open task editor is saved", async () => {
    const source = createPreviewAdapter();
    render(
      <WorkspaceDataProvider source={source}>
        <ProjectPage projectId="northstar" tab="tasks" filter="all" />
      </WorkspaceDataProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Approve final color pass/, expanded: false }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Done: Approve final color pass" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(source.getSnapshot().tasks[0]?.status).toBe("done");
  });
  it("preserves the active project tab and filter in recent-project links", async () => {
    render(
      <WorkspaceDataProvider source={createPreviewAdapter()}>
        <ProjectPage projectId="northstar" tab="tasks" filter="blocked" />
      </WorkspaceDataProvider>,
    );
    const sidebar = await screen.findByRole("complementary");
    expect(within(sidebar).getByRole("link", { name: "Q3 / Brand campaign" })).toHaveAttribute(
      "data-search",
      JSON.stringify({ tab: "tasks", filter: "blocked" }),
    );
  });
  it("keeps the workspace sidebar collapsed across route remounts", async () => {
    const source = createPreviewAdapter();
    const first = render(
      <WorkspaceDataProvider source={source}>
        <CleanHome />
      </WorkspaceDataProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Collapse sidebar" }));
    first.unmount();
    render(
      <WorkspaceDataProvider source={source}>
        <ProjectPage projectId="northstar" tab="overview" filter="all" />
      </WorkspaceDataProvider>,
    );
    expect(await screen.findByRole("button", { name: "Expand sidebar" })).toBeVisible();
  });
  it("opens search with the keyboard and filters grouped results", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceDataProvider source={createPreviewAdapter()}>
        <CleanHome />
      </WorkspaceDataProvider>,
    );
    await screen.findByRole("heading", { name: "What will you move forward?" });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const search = await screen.findByRole("textbox", { name: "Search workspace" });
    await user.type(search, "does-not-exist");
    expect(screen.getByText("No matches")).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("restores focus to the search button when its dialog closes", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceDataProvider source={createPreviewAdapter()}>
        <CleanHome />
      </WorkspaceDataProvider>,
    );
    const searchButton = await screen.findByRole("button", { name: "Search workspace" });
    await user.click(searchButton);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(searchButton).toHaveFocus());
  });
  it("handles a long title and a missing project without breaking navigation", async () => {
    const source = createPreviewAdapter();
    source.createProject("Long project title ".repeat(6));
    render(
      <WorkspaceDataProvider source={source}>
        <ProjectPage projectId="missing" tab="overview" filter="all" />
      </WorkspaceDataProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "This project is not available" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
  });
  it("rejects cross-project Pi session URLs", async () => {
    const source = createPreviewAdapter();
    const session = source.createSession("northstar", "Plan it");
    render(
      <WorkspaceDataProvider source={source}>
        <PiPage projectId="campaign" sessionId={session.id} />
      </WorkspaceDataProvider>,
    );
    expect(await screen.findByText("This conversation is not available")).toBeVisible();
  });
  it("shows Pi runtime steps and a stop action", async () => {
    const source = createPreviewAdapter();
    const session = source.createSession("northstar", "Plan it");
    source.updateSession({ ...session, status: "running", steps: ["understand"] });
    source.hydrate = () => {};
    render(
      <WorkspaceDataProvider source={source}>
        <PiPage projectId="northstar" sessionId={session.id} />
      </WorkspaceDataProvider>,
    );
    expect(await screen.findByRole("button", { name: "Stop run" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Running" })).toBeVisible();
  });
});
