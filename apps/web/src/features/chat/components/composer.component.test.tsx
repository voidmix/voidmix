/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@voidmix/i18n/client";

import { messages } from "../../../../tests/fixtures/messages";
import { Composer } from "./composer";

afterEach(() => cleanup());

function renderComposer(options?: Parameters<typeof userEvent.setup>[0]) {
  const onSubmit = vi.fn();
  render(
    <I18nProvider locale="en" messages={messages}>
      <Composer onSubmit={onSubmit} />
    </I18nProvider>,
  );
  return {
    onSubmit,
    textarea: screen.getByRole("textbox", { name: "Ask Voidmix" }),
    user: userEvent.setup(options),
  };
}

function optionNames() {
  return screen.getAllByRole("option").map((option) => option.textContent);
}

describe("chat composer skill menu", () => {
  it("opens the skill listbox when a slash starts a token", async () => {
    const { textarea, user } = renderComposer();

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(textarea, "/");

    expect(screen.getByRole("listbox", { name: "Skills" })).toBeVisible();
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("filters options as the query narrows", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/");
    expect(optionNames()).toHaveLength(4);

    await user.type(textarea, "s");
    expect(optionNames()).toEqual([expect.stringContaining("/summarize")]);
  });

  it("hides the listbox when nothing matches", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/zzz");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does not open for a slash inside a word", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "http://example");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens for a slash after a space", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "tell me /");

    expect(screen.getByRole("listbox", { name: "Skills" })).toBeVisible();
  });

  it("moves the active option with the arrow keys and wraps at the ends", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");
    expect(screen.getAllByRole("option")[3]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("keeps aria-activedescendant inside the filtered list when it shrinks", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(screen.getAllByRole("option")[3]).toHaveAttribute("aria-selected", "true");

    await user.type(textarea, "s");

    const remaining = screen.getAllByRole("option");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveAttribute("aria-selected", "true");
    expect(textarea).toHaveAttribute("aria-activedescendant", remaining[0]?.id);
  });

  it("inserts the active skill on Enter and closes the listbox", async () => {
    const { onSubmit, textarea, user } = renderComposer();

    await user.type(textarea, "/rev");
    await user.keyboard("{Enter}");

    expect(textarea).toHaveValue("/review ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("inserts the active skill on Tab", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/exp");
    await user.keyboard("{Tab}");

    expect(textarea).toHaveValue("/explain ");
  });

  it("replaces only the token when the draft has trailing text", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "look at /sum");
    await user.keyboard("{Enter}");

    expect(textarea).toHaveValue("look at /summarize ");
  });

  it("closes the listbox on Escape and reopens it on the next keystroke", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/");
    expect(screen.getByRole("listbox")).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.type(textarea, "r");
    expect(screen.getByRole("listbox")).toBeVisible();
    expect(optionNames()).toEqual([expect.stringContaining("/review")]);
  });

  it("inserts a clicked skill without moving focus off the textarea", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/");
    await user.click(screen.getByRole("option", { name: /brainstorm/ }));

    expect(textarea).toHaveValue("/brainstorm ");
    expect(textarea).toHaveFocus();
  });

  it("closes the listbox when the textarea loses focus", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/");
    expect(screen.getByRole("listbox")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add attachment or skill" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ignores Enter while an IME composition is active", async () => {
    const { onSubmit, textarea, user } = renderComposer();

    await user.type(textarea, "/rev");
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });

    expect(textarea).toHaveValue("/rev");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exposes the listbox to the textarea without overriding its textbox role", async () => {
    const { textarea, user } = renderComposer();

    await user.type(textarea, "/");

    const listbox = screen.getByRole("listbox", { name: "Skills" });
    expect(textarea).not.toHaveAttribute("role");
    expect(textarea).toHaveAttribute("aria-autocomplete", "list");
    expect(textarea).toHaveAttribute("aria-controls", listbox.id);
    expect(textarea).toHaveAttribute("aria-owns", listbox.id);
    expect(textarea).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[0]?.id);
  });

  it("inserts a skill at the caret from the attachment menu", async () => {
    // Base UI keeps `pointer-events: none` on a popup until its open animation
    // finishes, and jsdom never runs the animation.
    const { textarea, user } = renderComposer({ pointerEventsCheck: 0 });

    await user.type(textarea, "look at this");
    await user.click(screen.getByRole("button", { name: "Add attachment or skill" }));
    await user.click(await screen.findByRole("menuitem", { name: "Skills" }));
    // A full pointer sequence unmounts the item on pointerup, so the trailing
    // click would land on a detached node without the animation jsdom skips.
    fireEvent.click(await screen.findByRole("menuitem", { name: "/summarize" }));

    expect(textarea).toHaveValue("look at this /summarize ");
  });

  it("drops the listbox wiring while the menu is closed", () => {
    const { textarea } = renderComposer();

    expect(textarea).not.toHaveAttribute("aria-controls");
    expect(textarea).not.toHaveAttribute("aria-activedescendant");
  });
});

describe("chat composer sending", () => {
  it("sends the draft on Enter", async () => {
    const { onSubmit, textarea, user } = renderComposer();

    await user.type(textarea, "what changed today");
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("what changed today");
    expect(textarea).toHaveValue("");
  });

  it("inserts a newline on Shift+Enter", async () => {
    const { onSubmit, textarea, user } = renderComposer();

    await user.type(textarea, "first");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(textarea, "second");

    expect(textarea).toHaveValue("first\nsecond");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the trimmed draft from the send button", async () => {
    const { onSubmit, textarea, user } = renderComposer();

    await user.type(textarea, "  spaced  ");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSubmit).toHaveBeenCalledWith("spaced");
    expect(textarea).toHaveValue("");
  });

  it("ignores an empty draft", async () => {
    const { onSubmit, textarea, user } = renderComposer();

    await user.type(textarea, "   ");
    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
