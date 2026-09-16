import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";
import { SectionHeading } from "./section-heading";
import { Switch } from "./components/ui/switch";

describe("workspace primitives", () => {
  it("supports labelled switch state changes and disabled state", () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch aria-label="Sync automatically" checked={false} onCheckedChange={onCheckedChange} />,
    );
    const control = screen.getByRole("switch", { name: "Sync automatically" });
    expect(control).not.toBeChecked();
    fireEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    expect(control).not.toBeDisabled();
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
    expect(screen.getByText("Blocked")).toHaveClass("text-foreground");
    expect(screen.getByText("Blocked").firstElementChild).toHaveClass("text-destructive");
  });
  it("renders a labelled section with optional description and action", () => {
    render(
      <SectionHeading
        title="Recent activity"
        description="The latest workspace changes"
        action={<button type="button">View all</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Recent activity" })).toBeVisible();
    expect(screen.getByText("The latest workspace changes")).toBeVisible();
    expect(screen.getByRole("button", { name: "View all" })).toBeVisible();
  });
});
