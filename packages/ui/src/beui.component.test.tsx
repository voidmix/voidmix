/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { BeuiButton } from "./beui-button";
import { BeuiBadge } from "./beui-badge";
import { BeuiSidebarNavigation, BeuiSidebarItem } from "./beui-sidebar-navigation";
import { Modal } from "./modal";

afterEach(cleanup);
it("keeps native button defaults, disabled behavior and React 19 refs", async () => {
  const submit = vi.fn((event) => event.preventDefault());
  const ref = createRef<HTMLButtonElement>();
  const user = userEvent.setup();
  render(
    <form onSubmit={submit}>
      <BeuiButton ref={ref}>Open</BeuiButton>
      <BeuiButton type="submit">Save</BeuiButton>
      <BeuiButton type="submit" disabled>
        Unavailable
      </BeuiButton>
    </form>,
  );
  expect(ref.current).toBe(screen.getByRole("button", { name: "Open" }));
  await user.click(ref.current!);
  expect(submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Unavailable" }));
  expect(submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(submit).toHaveBeenCalledOnce();
});

it("composes a beUI trigger with Base UI focus restoration and themed portal", async () => {
  function Example() {
    const [open, setOpen] = useState(false);
    return (
      <Modal
        title="Create project"
        closeLabel="Close"
        open={open}
        onOpenChange={setOpen}
        surfaceClassName="beui-theme"
        trigger={<BeuiButton>New project</BeuiButton>}
      >
        <input aria-label="Title" autoFocus />
      </Modal>
    );
  }
  const user = userEvent.setup();
  render(<Example />);
  const trigger = screen.getByRole("button", { name: "New project" });
  await user.click(trigger);
  expect(await screen.findByRole("dialog")).toHaveClass("beui-theme");
  expect(screen.getByRole("textbox")).toHaveFocus();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
});

it("preserves caller navigation, current-page semantics and isolated highlight state", () => {
  const selected = vi.fn((event) => event.preventDefault());
  render(
    <>
      <BeuiSidebarNavigation label="First">
        <BeuiSidebarItem id="projects" active>
          <a href="/projects" aria-current="page" onClick={selected}>
            Projects
          </a>
        </BeuiSidebarItem>
        <BeuiSidebarItem id="admin" active={false}>
          <a href="/admin">Admin</a>
        </BeuiSidebarItem>
      </BeuiSidebarNavigation>
      <BeuiSidebarNavigation label="Second">
        <BeuiSidebarItem id="projects" active>
          <a href="/projects">Other projects</a>
        </BeuiSidebarItem>
      </BeuiSidebarNavigation>
    </>,
  );
  const project = screen.getByRole("link", { name: "Projects" });
  fireEvent.click(project, { ctrlKey: true });
  expect(selected).toHaveBeenCalledOnce();
  expect(selected.mock.calls[0]?.[0].ctrlKey).toBe(true);
  expect(project).toHaveAttribute("aria-current", "page");
  fireEvent.focus(screen.getByRole("link", { name: "Admin" }));
  expect(
    screen.getByRole("navigation", { name: "First" }).querySelector("[aria-hidden]")?.parentElement,
  ).toContainElement(screen.getByRole("link", { name: "Admin" }));
  expect(
    screen.getByRole("navigation", { name: "Second" }).querySelector("[aria-hidden]")
      ?.parentElement,
  ).toContainElement(screen.getByRole("link", { name: "Other projects" }));
});

it("renders a visible translated badge on the first render and updates its label", async () => {
  const { rerender } = render(<BeuiBadge tone="neutral">草稿</BeuiBadge>);
  expect(screen.getByText("草稿")).toBeVisible();
  rerender(<BeuiBadge tone="success">已交付</BeuiBadge>);
  await waitFor(() => expect(screen.getByText("已交付")).toBeVisible());
});
