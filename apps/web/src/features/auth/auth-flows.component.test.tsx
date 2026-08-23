/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  notifyAuthFailure: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  verifyEmail: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => mocks.navigate,
}));

vi.mock("../../lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: mocks.requestPasswordReset,
    resetPassword: mocks.resetPassword,
    verifyEmail: mocks.verifyEmail,
  },
  signIn: { email: mocks.signInEmail },
  signUp: { email: mocks.signUpEmail },
}));

vi.mock("./feedback", () => ({
  notifyAuthFailure: mocks.notifyAuthFailure,
}));

import { AuthForm } from "./auth-form";
import { PasswordField } from "./password-field";
import { ResetPassword } from "./reset-password";
import { VerifyEmail } from "./verify-email";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.navigate.mockResolvedValue(undefined);
  mocks.notifyAuthFailure.mockReturnValue("Unable to complete authentication.");
});

describe("authentication forms", () => {
  it("signs in with email credentials and opens Admin", async () => {
    mocks.signInEmail.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mocks.signInEmail).toHaveBeenCalledWith({
        email: "owner@example.com",
        password: "password123",
      });
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/admin" });
    });
  });

  it("creates an account and opens the verification state", async () => {
    mocks.signUpEmail.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada Lovelace");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(mocks.signUpEmail).toHaveBeenCalledWith({
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "password123",
      });
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/verify-email" });
    });
  });

  it("keeps authentication failures visible and does not navigate", async () => {
    mocks.signInEmail.mockResolvedValue({ data: null, error: { message: "Invalid credentials" } });
    mocks.notifyAuthFailure.mockReturnValue("Invalid credentials");
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "incorrect-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
    expect(mocks.notifyAuthFailure).toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("toggles password visibility without submitting the form", async () => {
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={submit}>
        <PasswordField id="test-password" label="Password" />
      </form>,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeVisible();
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("password reset and email verification", () => {
  it("requests a reset link and renders the non-enumerating success state", async () => {
    mocks.requestPasswordReset.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    render(<ResetPassword />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "owner@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeVisible();
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith({
      email: "owner@example.com",
      redirectTo: expect.stringMatching(/\/reset-password$/),
    });
  });

  it("verifies a token and exposes the completed state", async () => {
    mocks.verifyEmail.mockResolvedValue({ data: {}, error: null });
    render(<VerifyEmail token="verification-token" />);

    expect(screen.getByRole("heading", { name: "Verifying your email" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Email verified" })).toBeVisible();
    expect(mocks.verifyEmail).toHaveBeenCalledWith({
      query: { token: "verification-token" },
    });
  });
});
