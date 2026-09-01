/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { UserDirectory } from "./directory";
import { createPreviewUsersAdapter } from "./preview-adapter";
import type { AdminUser, AdminUsersClient } from "./types";

const users: readonly AdminUser[] = [
  {
    id: "owner",
    name: "Mina Cole",
    email: "owner@example.com",
    role: "owner",
    status: "active",
    lastActive: "2 min ago",
    joinedAt: "May 18, 2026",
  },
  {
    id: "member",
    name: "Samira Bell",
    email: "samira@example.com",
    role: "user",
    status: "active",
    lastActive: "1 hr ago",
    joinedAt: "Jun 21, 2026",
  },
  {
    id: "suspended",
    name: "Rei Nakamura",
    email: "rei@example.com",
    role: "user",
    status: "suspended",
    lastActive: "9 days ago",
    joinedAt: "Apr 07, 2026",
  },
];

afterEach(() => cleanup());

function renderDirectory(client: AdminUsersClient = createPreviewUsersAdapter(users)) {
  render(<UserDirectory client={client} />);
  return userEvent.setup();
}

describe("UserDirectory", () => {
  it("filters the directory by role", async () => {
    const user = renderDirectory();
    await screen.findByText("Samira Bell");

    await user.click(screen.getByRole("button", { name: "Filter by role" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Owner" }));

    await waitFor(() => {
      expect(screen.getByText("Mina Cole")).toBeInTheDocument();
      expect(screen.queryByText("Samira Bell")).not.toBeInTheDocument();
    });
  });

  it("supports selecting a member and changing its status", async () => {
    const user = renderDirectory();
    await screen.findByText("Samira Bell");

    await user.click(screen.getByRole("checkbox", { name: "Select Samira Bell" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Suspend selected" }));

    await waitFor(() => {
      const memberRow = screen.getByRole("checkbox", { name: "Select Samira Bell" }).closest("tr");
      expect(memberRow).not.toBeNull();
      expect(within(memberRow!).getByText("Suspended")).toBeInTheDocument();
      expect(screen.getByText("1 user updated to suspended.")).toBeInTheDocument();
    });
  });

  it("keeps the owner protected from bulk status changes", async () => {
    const user = renderDirectory();
    await screen.findByText("Mina Cole");

    await user.click(screen.getByRole("checkbox", { name: "Select Mina Cole" }));

    expect(screen.getByRole("button", { name: "Suspend selected" })).toBeDisabled();
    expect(screen.getByText("Owner stays protected")).toBeInTheDocument();
  });

  it("shows a retry action when loading fails", async () => {
    const listUsers = vi
      .fn<AdminUsersClient["listUsers"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(users);
    const client: AdminUsersClient = {
      listUsers,
      updateUserStatus: vi.fn(async (input) => ({
        ...users[1]!,
        id: input.userId,
        status: input.status,
      })),
    };
    const user = renderDirectory(client);

    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getByText("Samira Bell")).toBeInTheDocument());
    expect(listUsers).toHaveBeenCalledTimes(2);
  });
});
