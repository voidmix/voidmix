/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { I18nProvider } from "@voidmix/i18n/client";
import { ThemeProvider } from "@voidmix/ui/theme";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { messages } from "../../../../tests/fixtures/messages";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOut: vi.fn(),
  session: {
    data: { user: { name: "Ada Lovelace", role: "owner" } } as
      | { user: { name: string; role?: string } }
      | undefined,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useMatchRoute: () => () => false,
  useNavigate: () => mocks.navigate,
}));

vi.mock("../../../lib/auth-client", () => ({
  signOut: mocks.signOut,
  useSession: () => mocks.session,
}));

const { AdminShell } = await import("./index");

// jsdom ships no matchMedia, and the theme provider resolves "system" through it.
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderShell() {
  render(
    <I18nProvider locale="en" messages={messages}>
      <ThemeProvider disableScript defaultTheme="system" storageKey={false}>
        <AdminShell>
          <p>Directory</p>
        </AdminShell>
      </ThemeProvider>
    </I18nProvider>,
  );
  return {
    trigger: screen.getByRole("button", { name: "Open account menu" }),
    user: userEvent.setup(),
  };
}

describe("admin shell account menu", () => {
  it("opens the account menu from the sidebar trigger", async () => {
    const { trigger, user } = renderShell();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(trigger);

    const menu = await screen.findByRole("menu");
    expect(menu).toBeVisible();
  });

  it("shows the operator name and role in the menu", async () => {
    const { trigger, user } = renderShell();

    await user.click(trigger);

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveTextContent("Ada Lovelace");
    expect(menu).toHaveTextContent("owner");
  });

  it("offers the three theme choices as a radio group", async () => {
    const { trigger, user } = renderShell();

    await user.click(trigger);
    await screen.findByRole("menu");

    expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
      "Light",
      "Dark",
      "System",
    ]);
  });

  it("signs out from the menu, which is the only sign-out control", async () => {
    const { trigger, user } = renderShell();

    // Sign out used to sit beside the trigger as a fourth child of a
    // three-column grid, which wrapped it onto its own row.
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }));
  });

  it("keeps the account block to one child per grid column", () => {
    renderShell();

    const account = screen.getByRole("img", { name: "Ada Lovelace" }).parentElement;
    expect(account).toHaveClass("grid-cols-[auto_1fr_auto]");
    expect(account?.children).toHaveLength(3);
  });
});
