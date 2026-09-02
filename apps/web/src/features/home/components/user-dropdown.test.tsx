/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@voidmix/i18n/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { messages } from "../../../../tests/fixtures/messages";
import { UserDropdown } from "./user-dropdown";

afterEach(() => cleanup());

function renderDropdown() {
  const onNewTask = vi.fn();
  const onSignOut = vi.fn(async () => undefined);

  render(
    <I18nProvider locale="en" messages={messages}>
      <UserDropdown
        onNewTask={onNewTask}
        onSignOut={onSignOut}
        user={{ email: "ada@example.com", name: "Ada Lovelace", role: "owner" }}
      />
    </I18nProvider>,
  );

  return { onNewTask, onSignOut, user: userEvent.setup() };
}

describe("home user dropdown", () => {
  it("exposes the signed-in identity from an accessible trigger", () => {
    renderDropdown();

    const trigger = screen.getByRole("button", { name: "Open user menu" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveTextContent("Ada Lovelace");
  });

  it("shows identity details and task actions", async () => {
    const { user, onNewTask } = renderDropdown();

    await user.click(screen.getByRole("button", { name: "Open user menu" }));

    expect(await screen.findByRole("menu")).toHaveTextContent("Ada Lovelace");
    expect(screen.getByText("ada@example.com")).toBeVisible();
    expect(screen.getByText("owner")).toBeVisible();

    await user.click(screen.getByRole("menuitem", { name: "New task" }));
    expect(onNewTask).toHaveBeenCalledOnce();
  });

  it("signs out from the menu", async () => {
    const { user, onSignOut } = renderDropdown();

    await user.click(screen.getByRole("button", { name: "Open user menu" }));
    await screen.findByRole("menu");
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => expect(onSignOut).toHaveBeenCalledOnce());
  });
});
