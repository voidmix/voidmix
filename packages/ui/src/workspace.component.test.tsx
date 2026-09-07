import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import { CommandInput } from "./command-input";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";

describe("workspace primitives", () => {
  it("disables empty input and exposes the submit action", () => {
    render(
      <CommandInput
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        label="Goal"
        placeholder="Describe a goal"
        submitLabel="Continue"
      />,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
  it("submits a trimmed goal using the keyboard shortcut", () => {
    const submit = vi.fn();
    render(
      <CommandInput
        value="  Launch  "
        onChange={() => {}}
        onSubmit={submit}
        label="Goal"
        placeholder="Describe a goal"
        submitLabel="Continue"
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Goal" }), {
      key: "Enter",
      ctrlKey: true,
    });
    expect(submit).toHaveBeenCalledWith("Launch");
  });
  it("does not submit while IME composition is active", () => {
    const submit = vi.fn();
    render(
      <CommandInput
        value="目标"
        onChange={() => {}}
        onSubmit={submit}
        label="Goal"
        placeholder="Describe a goal"
        submitLabel="Continue"
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Goal" }), {
      key: "Enter",
      ctrlKey: true,
      isComposing: true,
    });
    expect(submit).not.toHaveBeenCalled();
  });
  it("communicates state with text and provides an actionable empty state", () => {
    render(
      <>
        <StatusBadge label="Blocked" tone="blocked" />
        <EmptyState
          title="Start a project"
          description="Keep your work together"
          action={<button type="button">Create project</button>}
        />
      </>,
    );
    expect(screen.getByText("Blocked")).toBeVisible();
    expect(screen.getByRole("button", { name: "Create project" })).toBeVisible();
  });
});
