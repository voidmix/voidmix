import { CheckCircle } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { useState, type FormEvent } from "react";

import { authClient } from "../../lib/auth-client";
import { AuthCard } from "./auth-card";
import { useAuthCapabilities } from "./capabilities";
import { useTranslations } from "../../i18n/client";

import { notifyAuthFailure } from "./feedback";
import { PasswordField } from "./password-field";
import { createPasswordResetCallbackUrl, normalizeAuthRedirect } from "./route-search";

export function ResetPassword({ token, redirectTo }: { token?: string; redirectTo?: string }) {
  const t = useTranslations("auth");
  const translateError = useTranslations("errors");
  const capabilities = useAuthCapabilities();
  const next = normalizeAuthRedirect(redirectTo);
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
            redirectTo: createPasswordResetCallbackUrl(window.location.origin, next),
          });

      if (result.error) {
        setError(
          notifyAuthFailure({
            translateError,
            title: t("passwordResetFailed"),
            error: result.error,
            fallback: t("passwordResetFallback"),
          }),
        );
      } else {
        setSent(true);
      }
    } catch (cause) {
      setError(
        notifyAuthFailure({
          translateError,
          title: t("passwordResetFailed"),
          error: cause,
          fallback: t("passwordResetFallback"),
        }),
      );
    }
    setPending(false);
  }

  if (!token && !capabilities.passwordResetRequestAvailable) {
    return (
      <AuthCard
        description={t("passwordResetUnavailableDescription")}
        footer={
          <Link
            className="font-medium text-foreground hover:underline"
            to="/login"
            {...(next ? { search: { redirect: next } } : {})}
          >
            {t("backToSignIn")}
          </Link>
        }
        title={t("passwordResetUnavailable")}
      >
        <p className="text-sm leading-6 text-muted-foreground">
          {t("passwordResetUnavailableBody")}
        </p>
      </AuthCard>
    );
  }

  if (sent) {
    return (
      <AuthCard
        description={token ? t("passwordUpdatedDescription") : t("resetLinkSentDescription")}
        title={token ? t("passwordUpdated") : t("checkEmail")}
      >
        <div className="space-y-5">
          <CheckCircle aria-hidden="true" className="size-9 text-primary" />
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link to="/login" {...(next ? { search: { redirect: next } } : {})} />}
            size="lg"
          >
            {t("backToSignIn")}
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      description={token ? t("chooseNewPassword") : t("sendResetDescription")}
      footer={
        <Link
          className="font-medium text-foreground hover:underline"
          to="/login"
          {...(next ? { search: { redirect: next } } : {})}
        >
          {t("backToSignIn")}
        </Link>
      }
      title={token ? t("setNewPassword") : t("resetYourPassword")}
    >
      <form aria-busy={pending} onSubmit={submit}>
        <FieldGroup className="gap-4">
          {token ? (
            <PasswordField
              aria-describedby={error ? "reset-error" : undefined}
              autoComplete="new-password"
              disabled={pending}
              id="new-password"
              label={t("newPassword")}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              value={password}
            />
          ) : (
            <Field>
              <FieldLabel htmlFor="reset-email">{t("email")}</FieldLabel>
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
                ? t("updatingPassword")
                : t("sendingResetLink")
              : token
                ? t("updatePassword")
                : t("sendResetLink")}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
