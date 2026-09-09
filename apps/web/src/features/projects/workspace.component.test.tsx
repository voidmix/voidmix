/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import messages from "../../../messages/en.json";
import { CleanHome } from "../home/clean-home";
import { PiPage } from "../pi/pi-page";
import { createProjectStudioPreviewAdapter } from "./preview-adapter";
import { ProjectPage } from "./project-page";
import { ProjectStudioDataProvider } from "./studio-data";
import { resetProjectStudioShell } from "./studio-shell-store";

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
vi.mock("../../i18n/client", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    let message = (messages.workspaceUi as Record<string, string>)[key] ?? key;
    for (const [name, value] of Object.entries(values ?? {}))
      message = message.replace(`{${name}}`, String(value));
    return message;
  },
  useFormatter: () => ({
    dateTime: (value: Date | number) => String(value),
    list: (value: Iterable<string>) => [...value].join(", "),
    number: (value: bigint | number) => String(value),
    relativeTime: (value: number, unit: string) => `${value} ${unit}`,
  }),
}));

beforeEach(() => {
  sessionStorage.clear();
  navigate.mockReset();
  resetProjectStudioShell();
});
afterEach(cleanup);

describe("Clean Signal workspace", () => {
  it("exposes the seven formal project sections and keeps Pi out of primary navigation", async () => {
    render(
      <ProjectStudioDataProvider source={createProjectStudioPreviewAdapter()}>
        <ProjectPage projectId="northstar" tab="overview" filter="all" />
      </ProjectStudioDataProvider>,
    );

    const navigation = await screen.findByRole("navigation", { name: "Projects" });
    for (const section of [
      "Overview",
      "Draft a brief",
      "Canvas",
      /^Tasks/,
      "Summarize feedback",
      "Recent activity",
      "Settings",
    ]) {
      expect(within(navigation).getByRole("link", { name: section })).toBeVisible();
    }
    expect(within(navigation).queryByRole("link", { name: "Pi" })).not.toBeInTheDocument();
  });

  it("shows one command entry, three templates and real project destinations", async () => {
    render(
      <ProjectStudioDataProvider source={createProjectStudioPreviewAdapter()}>
        <CleanHome />
      </ProjectStudioDataProvider>,
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
    const source = createProjectStudioPreviewAdapter();
    render(
      <ProjectStudioDataProvider source={source}>
        <CleanHome />
      </ProjectStudioDataProvider>,
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
    const source = createProjectStudioPreviewAdapter({
      version: 1,
      projects: [],
      tasks: [],
      activity: [],
      sessions: [],
    });
    render(
      <ProjectStudioDataProvider source={source}>
        <CleanHome />
      </ProjectStudioDataProvider>,
    );
    await screen.findByText("Make room for your next idea");
    expect(screen.getByRole("link", { name: "Create project" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Ask Voidmix" })).toBeDisabled();
  });
  it("shows loading and retryable data errors", async () => {
    const source = createProjectStudioPreviewAdapter();
    vi.spyOn(source, "hydrate")
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValue(undefined);
    render(
      <ProjectStudioDataProvider source={source}>
        <ProjectPage projectId="northstar" tab="overview" filter="all" />
      </ProjectStudioDataProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your workspace could not be loaded",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "Northstar / Launch film" });
  });
  it("updates and undoes task status from the project task list", async () => {
    const source = createProjectStudioPreviewAdapter();
    render(
      <ProjectStudioDataProvider source={source}>
        <ProjectPage projectId="northstar" tab="tasks" filter="all" />
      </ProjectStudioDataProvider>,
    );
    const done = await screen.findByRole("button", { name: "Done: Approve final color pass" });
    fireEvent.click(done);
    expect(source.getSnapshot().tasks[0]?.status).toBe("done");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(source.getSnapshot().tasks[0]?.status).toBe("blocked");
  });
  it("keeps a quick status update when the open task editor is saved", async () => {
    const source = createProjectStudioPreviewAdapter();
    render(
      <ProjectStudioDataProvider source={source}>
        <ProjectPage projectId="northstar" tab="tasks" filter="all" />
      </ProjectStudioDataProvider>,
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
      <ProjectStudioDataProvider source={createProjectStudioPreviewAdapter()}>
        <ProjectPage projectId="northstar" tab="tasks" filter="blocked" />
      </ProjectStudioDataProvider>,
    );
    const sidebar = await screen.findByRole("complementary");
    expect(within(sidebar).getByRole("link", { name: "Q3 / Brand campaign" })).toHaveAttribute(
      "data-search",
      JSON.stringify({ tab: "tasks", filter: "blocked" }),
    );
  });
  it("keeps the workspace sidebar collapsed across route remounts", async () => {
    const source = createProjectStudioPreviewAdapter();
    const first = render(
      <ProjectStudioDataProvider source={source}>
        <CleanHome />
      </ProjectStudioDataProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Collapse sidebar" }));
    first.unmount();
    render(
      <ProjectStudioDataProvider source={source}>
        <ProjectPage projectId="northstar" tab="overview" filter="all" />
      </ProjectStudioDataProvider>,
    );
    expect(await screen.findByRole("button", { name: "Expand sidebar" })).toBeVisible();
  });
  it("opens search with the keyboard and filters grouped results", async () => {
    const user = userEvent.setup();
    render(
      <ProjectStudioDataProvider source={createProjectStudioPreviewAdapter()}>
        <CleanHome />
      </ProjectStudioDataProvider>,
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
      <ProjectStudioDataProvider source={createProjectStudioPreviewAdapter()}>
        <CleanHome />
      </ProjectStudioDataProvider>,
    );
    const searchButton = await screen.findByRole("button", { name: "Search workspace" });
    await user.click(searchButton);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(searchButton).toHaveFocus());
  });
  it("handles a long title and a missing project without breaking navigation", async () => {
    const source = createProjectStudioPreviewAdapter();
    source.createProject("Long project title ".repeat(6));
    render(
      <ProjectStudioDataProvider source={source}>
        <ProjectPage projectId="missing" tab="overview" filter="all" />
      </ProjectStudioDataProvider>,
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
    const source = createProjectStudioPreviewAdapter();
    const session = source.createSession("northstar", "Plan it");
    render(
      <ProjectStudioDataProvider source={source}>
        <PiPage projectId="campaign" sessionId={session.id} />
      </ProjectStudioDataProvider>,
    );
    expect(await screen.findByText("This conversation is not available")).toBeVisible();
  });
  it("shows Pi runtime steps and a stop action", async () => {
    const source = createProjectStudioPreviewAdapter();
    const session = source.createSession("northstar", "Plan it");
    source.updateSession({ ...session, status: "running", steps: ["understand"] });
    source.hydrate = () => {};
    render(
      <ProjectStudioDataProvider source={source}>
        <PiPage projectId="northstar" sessionId={session.id} />
      </ProjectStudioDataProvider>,
    );
    expect(await screen.findByRole("button", { name: "Stop run" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Running" })).toBeVisible();
  });
});
