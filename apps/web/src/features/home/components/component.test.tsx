/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const routerMocks = vi.hoisted(() => ({ navigate: vi.fn(), signOut: vi.fn() }));
const sessionMocks = vi.hoisted(() => ({
  value: {
    data: null as { user: { name: string; email: string; role?: string } } | null,
    isPending: false,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => routerMocks.navigate,
}));

vi.mock("../../../lib/auth-client", () => ({
  signOut: routerMocks.signOut,
  useSession: () => sessionMocks.value,
}));

vi.mock("@voidmix/i18n/client", () => ({
  useTranslations: () => (key: string) =>
    ({
      account: "Account",
      activeProgress: "3 of 4 active",
      admin: "Admin",
      askVoidmix: "Ask Voidmix",
      askWorkspace: "Ask about this workspace",
      assetsDescription: "Keep final files and handoffs in one place.",
      assetsPreview: "No shared assets have been added yet.",
      assetsState: "Library is ready",
      chatUnavailableDescription: "This local chat is no longer available.",
      chatUnavailableTitle: "This local chat is no longer available",
      chatLoading: "Loading local chat…",
      conversation: "Conversation",
      continueWhereLeftOff: "Continue where you left off",
      creativeLead: "Creative lead",
      currentProject: "Current project",
      currentProjectContext: "Current project context",
      decisionsDescription: "Make ownership and rationale explicit.",
      decisionsPreview: "Decision history will appear here.",
      decisionsState: "No unresolved decisions",
      editor: "Editor",
      featuredDetail: "Review the color pass and close the last delivery decision.",
      featuredMeta: "Northstar / Launch film · Updated 8 min ago",
      featuredState: "On track",
      featuredTitle: "Final cut / v18",
      inboxDescription: "Review conversations that need a response.",
      inboxPreview: "4 threads are queued for review.",
      inboxState: "Ready for triage",
      member: "Member",
      launcherAskProject: "Ask about project",
      launcherBlockers: "Find what is blocking delivery",
      launcherNextSteps: "Turn the brief into next steps",
      launcherProjectDetail: "3 reviewers ready · delivery is moving forward",
      launcherProjectPrompt: "What should we do next on the Northstar launch film?",
      launcherProjectsTitle: "Recent projects",
      launcherReview: "Prepare the next review decision",
      launcherSummary: "Summarize the current project",
      navAssets: "Assets",
      navDecisions: "Decisions",
      navInbox: "Inbox",
      navOverview: "Overview",
      navProjects: "Projects",
      navReviews: "Reviews",
      newTask: "New task",
      northstarLaunch: "Northstar launch",
      northstarWorkspace: "Northstar workspace",
      now: "Now",
      onTrack: "On track",
      openThread: "Open thread",
      openUserMenu: "Open user menu",
      openWorkspaceNavigation: "Open workspace navigation",
      operators: "Operators",
      preview: "Preview",
      previewData: "Preview data",
      previewDataStays: "Northstar preview data stays in this browser.",
      previewEnvironment: "Preview environment",
      previewLabel: "Preview",
      previewResponse: "The final color pass remains the current blocker.",
      producer: "Producer",
      projectsDescription: "Keep briefs, ownership, and delivery state together.",
      projectsPreview: "Northstar / Launch film is active.",
      projectsState: "1 active project",
      release: "Release",
      releaseToday: "Release today",
      review: "Review",
      reviewsDescription: "Track approvals before work moves forward.",
      reviewsPreview: "3 reviews are waiting for a decision.",
      reviewsState: "Needs attention",
      sendMessage: "Send message",
      signingOut: "Signing out…",
      settings: "Settings",
      startDescription: "Start with a brief, a decision, or a question for the workspace.",
      startTitle: "What should we move forward?",
      team: "Team",
      threeOnline: "3 online",
      updatedAt: "Updated 8 min ago",
      viewAll: "View all",
      workspace: "Workspace",
      workspaceSignal: "Workspace signal",
      you: "You",
    })[key] ?? key,
}));

vi.mock("../../../components/language-switcher", () => ({
  LanguageSwitcher: () => <button aria-label="Language: English">Language</button>,
}));

vi.mock("../../../components/theme-switcher", () => ({
  ThemeSwitcher: () => <button aria-label="Theme: System">Theme</button>,
}));

vi.mock("@voidmix/ui/logo", () => ({
  Logo: ({ label }: { label?: string }) => <span>{label ?? "Voidmix"}</span>,
}));

import { createLocalChatSession, readLocalChatSession } from "../../chat/local-chat-store";
import type { ChatMessage } from "../../chat/types";
import { ChatWorkspace } from "./chat-workspace";
import { WorkspaceLayout } from "./workspace-layout";

afterEach(() => {
  cleanup();
  routerMocks.navigate.mockReset();
  routerMocks.signOut.mockReset();
  sessionMocks.value = { data: null, isPending: false };
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

describe("workspace launcher", () => {
  it("renders a focused launcher instead of the full workbench", () => {
    render(<WorkspaceLayout />);

    expect(screen.getByRole("heading", { name: "What should we move forward?" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Ask Voidmix" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Summarize the current project" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Recent projects" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Workspace signal" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Current project context" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Inbox" })).not.toBeInTheDocument();
    expect(screen.queryByText("Recent")).not.toBeInTheDocument();
  });

  it("fills quick prompts without submitting", async () => {
    const user = userEvent.setup();
    render(<WorkspaceLayout />);

    await user.click(screen.getByRole("button", { name: "Find what is blocking delivery" }));

    expect(screen.getByRole("textbox", { name: "Ask Voidmix" })).toHaveValue(
      "Find what is blocking delivery",
    );
    expect(routerMocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Ask Voidmix" })).toHaveFocus();
  });

  it("stores the local chat and redirects signed-out users to login", async () => {
    const user = userEvent.setup();
    render(<WorkspaceLayout />);

    await user.type(screen.getByRole("textbox", { name: "Ask Voidmix" }), "What is blocked?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(routerMocks.navigate).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: expect.stringMatching(/^\/chat\/[\w-]+$/) },
    });
    const redirect = routerMocks.navigate.mock.calls[0]?.[0].search.redirect as string;
    const chatId = redirect.split("/").at(-1);
    expect(chatId).toBeTruthy();
    expect(readLocalChatSession(chatId ?? "")?.messages).toHaveLength(2);
  });

  it("opens the local chat directly for a signed-in user", async () => {
    sessionMocks.value = {
      data: { user: { name: "Ada Lovelace", email: "ada@example.com", role: "user" } },
      isPending: false,
    };
    const user = userEvent.setup();
    render(<WorkspaceLayout />);

    await user.type(screen.getByRole("textbox", { name: "Ask Voidmix" }), "Start the brief");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(routerMocks.navigate).toHaveBeenCalledWith({
      to: "/chat/$chatId",
      params: { chatId: expect.any(String) },
    });
  });

  it("shows the signed-in account as a user dropdown", async () => {
    sessionMocks.value = {
      data: { user: { name: "Ada Lovelace", email: "ada@example.com", role: "user" } },
      isPending: false,
    };
    render(<WorkspaceLayout />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Open user menu" })).toHaveLength(2),
    );
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("keeps launcher navigation scoped to overview and projects", () => {
    window.location.hash = "#projects";
    render(<WorkspaceLayout />);

    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "#projects");
    expect(screen.queryByRole("link", { name: "Reviews" })).not.toBeInTheDocument();
  });

  it("keeps language and theme controls icon-only in the utility areas", () => {
    render(<WorkspaceLayout />);

    expect(screen.getAllByRole("button", { name: "Language: English" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Theme: System" })).toHaveLength(2);
    expect(screen.queryByText("EN")).not.toBeInTheDocument();
    expect(screen.queryByText("中文")).not.toBeInTheDocument();
  });
});

describe("chat workspace", () => {
  const messages: readonly ChatMessage[] = [
    { id: "user-0", role: "user", content: "What is blocked?", timestamp: "Now" },
    { id: "assistant-0", role: "assistant", content: "The color pass.", timestamp: "Preview" },
  ];

  it("renders the full workbench from a local chat session", () => {
    const chatId = createLocalChatSession(messages);
    render(<ChatWorkspace chatId={chatId} />);

    expect(screen.getByRole("heading", { name: "Workspace signal" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Continue where you left off" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Current project context" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Inbox" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Reviews" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Recent projects" })).not.toBeInTheDocument();
  });

  it("persists additional messages in the current tab", async () => {
    const user = userEvent.setup();
    const chatId = createLocalChatSession(messages);
    render(<ChatWorkspace chatId={chatId} />);

    await user.type(screen.getByRole("textbox", { name: "Ask Voidmix" }), "What happens next?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(readLocalChatSession(chatId)?.messages).toHaveLength(4));
  });

  it("shows a recovery state when the local session is missing", () => {
    render(<ChatWorkspace chatId="missing-chat" />);

    expect(
      screen.getByRole("heading", { name: "This local chat is no longer available" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "New task" })).toBeVisible();
  });
});
