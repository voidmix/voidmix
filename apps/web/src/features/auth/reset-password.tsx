import { CheckCircle } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { useState, type FormEvent } from "react";

import { authClient } from "../../lib/auth-client";
import { AuthCard } from "./auth-card";
import { useAuthCapabilities } from "./capabilities";
import { useTranslations } from "@voidmix/i18n/client";

import { notifyAuthFailure } from "./feedback";
import { PasswordField } from "./password-field";

export function ResetPassword({ token }: { token?: string }) {
  const translateError = useTranslations("errors");
  const capabilities = useAuthCapabilities();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = token
        ? await authClient.resetPassword({ newPassword: password, token })
        : await authClient.requestPasswordReset({
            email,
            redirectTo: `${window.location.origin}/reset-password`,
          });

      if (result.error) {
        setError(
          notifyAuthFailure({
            translateError,
            title: "Password reset failed",
            error: result.error,
            fallback: "Unable to reset your password. Try again.",
          }),
        );
        return;
      }

      setSent(true);
    } catch (cause) {
      setError(
        notifyAuthFailure({
          translateError,
          title: "Password reset failed",
          error: cause,
          fallback: "Unable to reset your password. Try again.",
        }),
      );
    } finally {
      setPending(false);
    }
  }

  if (!token && !capabilities.passwordResetRequestAvailable) {
    return (
      <AuthCard
        description="Password reset email requests are not available with the current system and mail configuration."
        footer={
          <Link className="font-medium text-foreground hover:underline" to="/login">
            Back to sign in
          </Link>
        }
        title="Password reset unavailable"
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Existing reset links can still be used. Contact an administrator if you need access.
        </p>
      </AuthCard>
    );
  }

  if (sent) {
    return (
      <AuthCard
        description={
          token
            ? "Your password has been updated. You can now use it to sign in."
            : "We sent a reset link if an account exists for that email address."
        }
        title={token ? "Password updated" : "Check your email"}
      >
        <div className="space-y-5">
          <CheckCircle aria-hidden="true" className="size-9 text-primary" />
          <Button className="w-full" nativeButton={false} render={<Link to="/login" />} size="lg">
            Back to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      description={
        token
          ? "Choose a new password with at least eight characters."
          : "Enter your email and we will send you a password reset link."
      }
      footer={
        <Link className="font-medium text-foreground hover:underline" to="/login">
          Back to sign in
        </Link>
      }
      title={token ? "Set a new password" : "Reset your password"}
    >
      <form aria-busy={pending} onSubmit={submit}>
        <FieldGroup className="gap-4">
          {token ? (
            <PasswordField
              aria-describedby={error ? "reset-error" : undefined}
              autoComplete="new-password"
              disabled={pending}
              id="new-password"
              label="New password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              value={password}
            />
          ) : (
            <Field>
              <FieldLabel htmlFor="reset-email">Email</FieldLabel>
              <Input
                aria-describedby={error ? "reset-error" : undefined}
                autoComplete="email"
                className="h-9"
                disabled={pending}
                id="reset-email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </Field>
          )}
          {error ? <FieldError id="reset-error">{error}</FieldError> : null}
          <Button className="mt-1 w-full" disabled={pending} size="lg" type="submit">
            {pending
              ? token
                ? "Updating password…"
                : "Sending reset link…"
              : token
                ? "Update password"
                : "Send reset link"}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
