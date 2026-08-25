import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { signIn, signUp } from "../../lib/auth-client";
import { AuthCard } from "./auth-card";
import { useAuthCapabilities } from "./capabilities";
import { notifyAuthFailure } from "./feedback";
import { PasswordField } from "./password-field";
import { loadAuthMessages } from "../../i18n/auth";
import { loadErrorMessages } from "../../i18n/errors";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth", loadAuthMessages);
  const translateError = useTranslations("errors", loadErrorMessages);
  const capabilities = useAuthCapabilities();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result =
        mode === "login"
          ? await signIn.email({ email, password })
          : await signUp.email({ email, password, name });

      if (result.error) {
        setError(
          notifyAuthFailure({
            translateError,
            title: mode === "login" ? t("signInFailed") : t("registrationFailed"),
            error: result.error,
            fallback: mode === "login" ? t("signInFallback") : t("registrationFallback"),
          }),
        );
        return;
      }
    } catch (cause) {
      setError(
        notifyAuthFailure({
          translateError,
          title: mode === "login" ? t("signInFailed") : t("registrationFailed"),
          error: cause,
          fallback: mode === "login" ? t("signInFallback") : t("registrationFallback"),
        }),
      );
      return;
    } finally {
      setPending(false);
    }

    if (mode === "register") {
      await navigate({ to: "/verify-email" });
    } else {
      await navigate({ to: "/admin" });
    }
  }

  if (mode === "register" && !capabilities.registrationAvailable) {
    return (
      <AuthCard
        description={t("registrationUnavailableDescription")}
        footer={
          <Link className="font-medium text-foreground hover:underline" to="/login">
            {t("backToSignIn")}
          </Link>
        }
        title={t("registrationUnavailable")}
      >
        <p className="text-sm leading-6 text-muted-foreground">
          {t("registrationUnavailableBody")}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      description={mode === "login" ? t("loginDescription") : t("registerDescription")}
      footer={
        mode === "login" && capabilities.registrationAvailable ? (
          <span>
            {t("newToVoidmix")}{" "}
            <Link className="font-medium text-foreground hover:underline" to="/register">
              {t("createAccount")}
            </Link>
          </span>
        ) : (
          <span>
            {t("alreadyHaveAccount")}{" "}
            <Link className="font-medium text-foreground hover:underline" to="/login">
              {t("signIn")}
            </Link>
          </span>
        )
      }
      title={mode === "login" ? t("welcomeBack") : t("createYourAccount")}
    >
      <form aria-busy={pending} onSubmit={submit}>
        <FieldGroup className="gap-4">
          {mode === "register" ? (
            <Field>
              <FieldLabel htmlFor="auth-name">{t("name")}</FieldLabel>
              <Input
                autoComplete="name"
                className="h-9"
                disabled={pending}
                id="auth-name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="auth-email">{t("email")}</FieldLabel>
            <Input
              aria-describedby={error ? "auth-error" : undefined}
              autoComplete="email"
              className="h-9"
              disabled={pending}
              id="auth-email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Field>
          <PasswordField
            action={
              mode === "login" && capabilities.passwordResetRequestAvailable ? (
                <Link
                  className="text-[0.8125rem] text-muted-foreground hover:text-foreground hover:underline"
                  to="/reset-password"
                >
                  {t("forgotPassword")}
                </Link>
              ) : null
            }
            aria-describedby={error ? "auth-error" : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            disabled={pending}
            id="auth-password"
            label={t("password")}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            value={password}
          />
          {error ? <FieldError id="auth-error">{error}</FieldError> : null}
          <Button className="mt-1 w-full" disabled={pending} size="lg" type="submit">
            {pending
              ? mode === "login"
                ? t("signingIn")
                : t("creatingAccount")
              : mode === "login"
                ? t("signIn")
                : t("createAccount")}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
