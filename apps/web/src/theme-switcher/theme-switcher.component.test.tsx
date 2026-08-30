/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@voidmix/i18n/client";
import { ThemeProvider } from "@voidmix/ui/theme";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { messages } from "../../tests/fixtures/messages";
import { ThemeSwitcher } from "../components/theme-switcher";

afterEach(() => cleanup());

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

function renderThemeSwitcher() {
  render(
    <I18nProvider locale="en" messages={messages}>
      <ThemeProvider disableScript defaultTheme="system" storageKey={false}>
        <ThemeSwitcher />
      </ThemeProvider>
    </I18nProvider>,
  );
  return userEvent.setup();
}

describe("theme switcher", () => {
  it("keeps the menu out of the initial render and loads it on open", async () => {
    const user = renderThemeSwitcher();
    const trigger = screen.getByRole("button", { name: "Theme: System" });

    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(await screen.findByRole("menu", {}, { timeout: 5000 })).toBeVisible();
    expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
      "Light",
      "Dark",
      "System",
    ]);
  });

  it("updates the trigger label after selecting a theme", async () => {
    const user = renderThemeSwitcher();

    await user.click(screen.getByRole("button", { name: "Theme: System" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Dark" }, { timeout: 5000 }));

    expect(screen.getByRole("button", { name: "Theme: Dark" })).toBeVisible();
  });
});
