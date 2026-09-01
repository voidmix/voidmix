import { CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { FieldError } from "@voidmix/ui/components/ui/field";
import { useEffect, useState, type ReactNode } from "react";

import { authClient } from "../../lib/auth-client";
import { AuthCard } from "./auth-card";
import { useTranslations } from "@voidmix/i18n/client";

import { notifyAuthFailure } from "./feedback";
import { normalizeAuthRedirect } from "./route-search";

type VerificationStatus = "waiting" | "verifying" | "verified" | "failed";

export function VerifyEmail({
  token,
  redirectTo,
  verified = false,
  verificationFailed = false,
}: {
  token?: string;
  redirectTo?: string;
  verified?: boolean;
  verificationFailed?: boolean;
}) {
  const translateError = useTranslations("errors");
  const next = normalizeAuthRedirect(redirectTo);
  const [status, setStatus] = useState<VerificationStatus>(
    token ? "verifying" : verified ? "verified" : verificationFailed ? "failed" : "waiting",
  );
  const [error, setError] = useState<string | null>(
    verificationFailed ? "This verification link is invalid or expired." : null,
  );

  useEffect(() => {
    if (!token) return;

    void authClient
      .verifyEmail({ query: { token } })
      .then((result) => {
        if (result.error) {
          setError(
            notifyAuthFailure({
              translateError,
              title: "Email verification failed",
              error: result.error,
              fallback: "This verification link is invalid or expired.",
            }),
          );
          setStatus("failed");
          return;
        }

        setStatus("verified");
      })
      .catch((cause: unknown) => {
        setError(
          notifyAuthFailure({
            translateError,
            title: "Email verification failed",
            error: cause,
            fallback: "This verification link is invalid or expired.",
          }),
        );
        setStatus("failed");
      });
  }, [token]);

  const content = {
    waiting: {
      description: "Use the verification link we sent to finish creating your account.",
      icon: <CheckCircle aria-hidden="true" className="size-9 text-primary" />,
      title: "Check your email",
    },
    verifying: {
      description: "We are confirming your email address. This should only take a moment.",
      icon: <CircleNotch aria-hidden="true" className="size-9 animate-spin text-primary" />,
      title: "Verifying your email",
    },
    verified: {
      description: "Your email address is verified. You can now sign in to Voidmix.",
      icon: <CheckCircle aria-hidden="true" className="size-9 text-primary" />,
      title: "Email verified",
    },
    failed: {
      description: "We could not verify this email address with the supplied link.",
      icon: <WarningCircle aria-hidden="true" className="size-9 text-destructive" />,
      title: "Verification failed",
    },
  } satisfies Record<VerificationStatus, { description: string; icon: ReactNode; title: string }>;

  const current = content[status];

  return (
    <AuthCard description={current.description} title={current.title}>
      <div aria-live="polite" className="space-y-5">
        {current.icon}
        {error ? <FieldError>{error}</FieldError> : null}
        {status !== "verifying" ? (
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link to="/login" {...(next ? { search: { redirect: next } } : {})} />}
            size="lg"
          >
            Back to sign in
          </Button>
        ) : null}
      </div>
    </AuthCard>
  );
}
