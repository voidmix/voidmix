import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { signIn, signUp } from "../../lib/auth-client";
import { AuthCard } from "./auth-card";
import { notifyAuthFailure } from "./feedback";
import { PasswordField } from "./password-field";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
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
            title: mode === "login" ? "Sign in failed" : "Registration failed",
            error: result.error,
            fallback:
              mode === "login"
                ? "Unable to sign in. Check your credentials and try again."
                : "Unable to create your account. Try again.",
          }),
        );
        return;
      }
    } catch (cause) {
      setError(
        notifyAuthFailure({
          title: mode === "login" ? "Sign in failed" : "Registration failed",
          error: cause,
          fallback:
            mode === "login"
              ? "Unable to sign in. Check your credentials and try again."
              : "Unable to create your account. Try again.",
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

  return (
    <AuthCard
      description={
        mode === "login"
          ? "Enter your account details to continue to the workspace."
          : "Create an account with your work email to get started."
      }
      footer={
        mode === "login" ? (
          <span>
            New to Voidmix?{" "}
            <Link className="font-medium text-foreground hover:underline" to="/register">
              Create account
            </Link>
          </span>
        ) : (
          <span>
            Already have an account?{" "}
            <Link className="font-medium text-foreground hover:underline" to="/login">
              Sign in
            </Link>
          </span>
        )
      }
      title={mode === "login" ? "Welcome back" : "Create your account"}
    >
      <form aria-busy={pending} onSubmit={submit}>
        <FieldGroup className="gap-4">
          {mode === "register" ? (
            <Field>
              <FieldLabel htmlFor="auth-name">Name</FieldLabel>
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
            <FieldLabel htmlFor="auth-email">Email</FieldLabel>
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
              mode === "login" ? (
                <Link
                  className="text-[0.8125rem] text-muted-foreground hover:text-foreground hover:underline"
                  to="/reset-password"
                >
                  Forgot password?
                </Link>
              ) : null
            }
            aria-describedby={error ? "auth-error" : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            disabled={pending}
            id="auth-password"
            label="Password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            value={password}
          />
          {error ? <FieldError id="auth-error">{error}</FieldError> : null}
          <Button className="mt-1 w-full" disabled={pending} size="lg" type="submit">
            {pending
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
