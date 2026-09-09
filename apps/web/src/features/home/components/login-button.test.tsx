/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@voidmix/i18n/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { messages } from "../../../../tests/fixtures/messages";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signInEmail: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));

vi.mock("../../auth/capabilities", () => ({
  useAuthCapabilities: () => ({
    passwordResetRequestAvailable: true,
    registrationAvailable: true,
    verificationEmailRequestAvailable: true,
  }),
}));

vi.mock("../../auth/feedback", () => ({
  notifyAuthFailure: () => "Unable to complete authentication.",
}));

vi.mock("../../../lib/auth-client", () => ({
  signIn: { email: mocks.signInEmail },
}));

import { LoginButton } from "./login-button";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signInEmail.mockResolvedValue({ data: {}, error: null });
});

function renderLoginButton() {
  render(
    <I18nProvider locale="en" messages={messages}>
      <LoginButton />
    </I18nProvider>,
  );
}

const lazyDialogQueryOptions = { timeout: 5000 };

describe("home sidebar login button", () => {
  it("opens the login dialog and stays on the current page after success", async () => {
    const user = userEvent.setup();
    renderLoginButton();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("dialog", {}, lazyDialogQueryOptions)).toBeVisible();
    await user.type(
      await screen.findByRole("textbox", { name: "Email" }, lazyDialogQueryOptions),
      "owner@example.com",
    );
    await user.type(
      await waitFor(() => screen.getByLabelText("Password"), lazyDialogQueryOptions),
      "password123",
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.signInEmail).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "password123",
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("keeps the dialog open when credentials are rejected", async () => {
    mocks.signInEmail.mockResolvedValue({
      data: null,
      error: { message: "Invalid credentials" },
    });
    const user = userEvent.setup();
    renderLoginButton();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Email" }, lazyDialogQueryOptions),
      "owner@example.com",
    );
    await user.type(
      await waitFor(() => screen.getByLabelText("Password"), lazyDialogQueryOptions),
      "incorrect-password",
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to complete authentication.",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("closes on Escape and restores focus to the sidebar trigger", async () => {
    const user = userEvent.setup();
    renderLoginButton();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("dialog", {}, lazyDialogQueryOptions);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveFocus();
  });
});
