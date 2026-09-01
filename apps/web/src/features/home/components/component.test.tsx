/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@voidmix/i18n/client", () => ({
  useTranslations: () => (key: string) =>
    ({
      account: "Account",
      activeProgress: "3 of 4 active",
      admin: "Admin",
      approveFinalColorPass: "Approve final color pass",
      askVoidmix: "Ask Voidmix",
      askWorkspace: "Ask about this workspace",
      sendMessage: "Send message",
      assetsDescription: "Keep final files and handoffs in one place.",
      assetsPreview: "No shared assets have been added yet.",
      assetsState: "Library is ready",
      brief: "Brief",
      continueWhereLeftOff: "Continue where you left off",
      currentProject: "Current project",
      currentProjectContext: "Current project context",
      creativeLead: "Creative lead",
      decisionsDescription: "Make ownership and rationale explicit.",
      decisionsPreview: "Decision history will appear here.",
      decisionsState: "No unresolved decisions",
      edit: "Edit",
      editor: "Editor",
      inboxDescription: "Review conversations that need a response.",
      inboxPreview: "4 threads are queued for review.",
      inboxState: "Ready for triage",
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
      openWorkspace: "Back to workspace",
      openWorkspaceNavigation: "Open workspace navigation",
      operators: "Operators",
      preview: "Preview",
      previewData: "Preview data",
      previewDataStays: "Northstar preview data stays in this browser.",
      previewLabel: "Preview",
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
      reviewNow: "Review now",
      settings: "Settings",
      startDescription: "Start with a brief, a decision, or a question for the workspace.",
      startTitle: "What should we move forward?",
      threeOnline: "3 online",
      workspace: "Workspace",
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

import { WorkspaceLayout } from "./workspace-layout";

afterEach(() => {
  cleanup();
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

describe("workspace layout", () => {
  it("starts with a focused chat entry instead of the full workbench", () => {
    render(<WorkspaceLayout />);

    expect(screen.getByRole("heading", { name: "What should we move forward?" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Ask Voidmix" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Continue where you left off" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Current project context" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Recent")).not.toBeInTheDocument();
  });

  it("expands into the full workbench after the first chat message", async () => {
    const user = userEvent.setup();
    render(<WorkspaceLayout />);

    await user.type(screen.getByRole("textbox", { name: "Ask Voidmix" }), "What is blocked?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Workspace signal" })).toBeVisible();
      expect(screen.getByRole("heading", { name: "Continue where you left off" })).toBeVisible();
      expect(screen.getByRole("complementary", { name: "Current project context" })).toBeVisible();
    });

    for (const section of ["inbox", "projects", "reviews", "decisions", "assets"]) {
      expect(document.getElementById(section)).toBeInTheDocument();
    }
  });

  it("uses stable hash targets and marks the active section", () => {
    window.location.hash = "#reviews";
    render(<WorkspaceLayout />);

    expect(screen.getByRole("link", { name: "Reviews" })).toHaveAttribute("href", "#reviews");
    expect(screen.getByRole("link", { name: "Reviews" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Back to workspace" })).toHaveLength(5);
    expect(screen.getAllByRole("link", { name: "Back to workspace" })[0]).toHaveAttribute(
      "href",
      "#ask-voidmix",
    );
  });

  it("updates the active navigation entry when the hash changes", async () => {
    render(<WorkspaceLayout />);

    window.location.hash = "#assets";
    window.dispatchEvent(new Event("hashchange"));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    });
  });

  it("keeps language and theme controls icon-only in the utility areas", () => {
    render(<WorkspaceLayout />);

    expect(screen.getAllByRole("button", { name: "Language: English" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Theme: System" })).toHaveLength(2);
    expect(screen.queryByText("EN")).not.toBeInTheDocument();
    expect(screen.queryByText("中文")).not.toBeInTheDocument();
  });
});
