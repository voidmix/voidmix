import { CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { FieldError } from "@voidmix/ui/components/ui/field";
import { useEffect, useState, type ReactNode } from "react";

import { authClient } from "../../lib/auth-client";
import { AuthCard } from "./auth-card";
import { useTranslations } from "../../i18n/client";

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
  const t = useTranslations("auth");
  const next = normalizeAuthRedirect(redirectTo);
  const [status, setStatus] = useState<VerificationStatus>(
    token ? "verifying" : verified ? "verified" : verificationFailed ? "failed" : "waiting",
  );
  const [error, setError] = useState<string | null>(
    verificationFailed ? t("verifyLinkInvalid") : null,
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
              title: t("emailVerificationFailed"),
              error: result.error,
              fallback: t("verifyLinkInvalid"),
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
            title: t("emailVerificationFailed"),
            error: cause,
            fallback: t("verifyLinkInvalid"),
          }),
        );
        setStatus("failed");
      });
  }, [token]);

  const content = {
    waiting: {
      description: t("verificationWaitingDescription"),
      icon: <CheckCircle aria-hidden="true" className="size-9 text-primary" />,
      title: t("checkEmail"),
    },
    verifying: {
      description: t("verifyingEmailDescription"),
      icon: <CircleNotch aria-hidden="true" className="size-9 animate-spin text-primary" />,
      title: t("verifyingEmail"),
    },
    verified: {
      description: t("emailVerifiedDescription"),
      icon: <CheckCircle aria-hidden="true" className="size-9 text-primary" />,
      title: t("emailVerified"),
    },
    failed: {
      description: t("verificationFailedDescription"),
      icon: <WarningCircle aria-hidden="true" className="size-9 text-destructive" />,
      title: t("verificationFailed"),
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
            {t("backToSignIn")}
          </Button>
        ) : null}
      </div>
    </AuthCard>
  );
}
