import { CircleNotch, FloppyDisk, LockKey, ShieldCheck } from "@phosphor-icons/react";
import { useTranslations, type WebTranslator } from "../../../i18n/client";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@voidmix/ui/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { toast } from "@voidmix/ui/toast";
import type { FormEvent } from "react";

import { translateWebError } from "../../../i18n/error-message";
import { useSession } from "../../../lib/auth-client";
import {
  SettingFieldHeading,
  SettingsLoading,
  SettingsPageHeader,
  SettingsUnavailable,
  formatValue,
  sourceLabel,
  type SettingSource,
} from "./components";
import { SettingsNavigation } from "./navigation";
import { useAuthSettings } from "./use-auth-settings";

export function AuthSettings() {
  const t = useTranslations("admin");
  const errorT = useTranslations("errors");
  const state = useAuthSettings();
  const session = useSession();
  const role = (session.data?.user as { role?: string } | undefined)?.role;
  const canWrite = role === "owner";

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || !state.hasChanges) return;
    try {
      await state.save();
      toast.add({
        title: t("authPolicySaved"),
        description: t("changedOverridesUpdated"),
        type: "success",
      });
    } catch {
      toast.add({
        title: t("authPolicySaveFailed"),
        description: t("reviewDomainsAndRetry"),
        type: "error",
        priority: "high",
      });
    }
  }

  return (
    <>
      <SettingsPageHeader
        description={t("authPolicyDescription")}
        title={t("authenticationPolicy")}
      />

      <SettingsNavigation current="auth" />

      {state.isLoading ? (
        <SettingsLoading label={t("authenticationPolicy")} />
      ) : state.settings ? (
        <form className="grid gap-5" onSubmit={(event) => void handleSave(event)}>
          <Card>
            <CardHeader>
              <CardTitle>{t("registrationAccess")}</CardTitle>
              <CardDescription>{t("registrationAccessDescription")}</CardDescription>
              <CardAction>
                <Badge variant={state.form.registrationMode === "open" ? "secondary" : "outline"}>
                  {state.form.registrationMode === "open" ? t("open") : t("closed")}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal" data-disabled={!canWrite || undefined}>
                  <div className="flex flex-col gap-1">
                    <SettingFieldHeading
                      canWrite={canWrite}
                      label={t("accountRegistration")}
                      source={state.settings.sources.registrationMode}
                      onReset={() => state.resetField("registrationMode")}
                    />
                    <FieldDescription>
                      {t("accountRegistrationDescription", {
                        value: formatValue(state.settings.inherited.registrationMode.value, t),
                        source: sourceLabel(
                          state.settings.inherited.registrationMode.source,
                          t,
                        ).toLowerCase(),
                      })}
                    </FieldDescription>
                  </div>
                  <Button
                    aria-pressed={state.form.registrationMode === "open"}
                    disabled={!canWrite}
                    type="button"
                    variant={state.form.registrationMode === "open" ? "primary" : "outline"}
                    onClick={() =>
                      state.updateForm(
                        "registrationMode",
                        state.form.registrationMode === "open" ? "closed" : "open",
                      )
                    }
                  >
                    <ShieldCheck data-icon="inline-start" aria-hidden="true" />
                    {state.form.registrationMode === "open"
                      ? t("registrationOpen")
                      : t("openRegistration")}
                  </Button>
                </Field>
                <Field data-disabled={!canWrite || undefined}>
                  <SettingFieldHeading
                    canWrite={canWrite}
                    htmlFor="allowed-email-domains"
                    label={t("allowedEmailDomains")}
                    source={state.settings.sources.allowedEmailDomains}
                    onReset={() => state.resetField("allowedEmailDomains")}
                  />
                  <Input
                    disabled={!canWrite}
                    id="allowed-email-domains"
                    placeholder={t("allowedEmailDomainsPlaceholder")}
                    value={state.form.allowedEmailDomains}
                    onChange={(event) =>
                      state.updateForm("allowedEmailDomains", event.target.value)
                    }
                  />
                  <FieldDescription>
                    {t("allowedEmailDomainsDescription", {
                      value: formatDomains(state.settings.inherited.allowedEmailDomains.value, t),
                    })}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("authenticationEmailBehavior")}</CardTitle>
              <CardDescription>{t("authenticationEmailBehaviorDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <PolicyToggle
                  canWrite={canWrite}
                  checked={state.form.verificationEmailEnabled}
                  description={t("verificationEmailsDescription")}
                  inherited={state.settings.inherited.verificationEmailEnabled.value}
                  label={t("verificationEmails")}
                  source={state.settings.sources.verificationEmailEnabled}
                  onChange={(value) => state.updateForm("verificationEmailEnabled", value)}
                  onReset={() => state.resetField("verificationEmailEnabled")}
                />
                <PolicyToggle
                  canWrite={canWrite}
                  checked={state.form.passwordResetEmailEnabled}
                  description={t("passwordResetEmailsDescription")}
                  inherited={state.settings.inherited.passwordResetEmailEnabled.value}
                  label={t("passwordResetEmails")}
                  source={state.settings.sources.passwordResetEmailEnabled}
                  onChange={(value) => state.updateForm("passwordResetEmailEnabled", value)}
                  onReset={() => state.resetField("passwordResetEmailEnabled")}
                />
                <PolicyToggle
                  canWrite={canWrite}
                  checked={state.form.welcomeEmailEnabled}
                  description={t("welcomeEmailsDescription")}
                  inherited={state.settings.inherited.welcomeEmailEnabled.value}
                  label={t("welcomeEmails")}
                  source={state.settings.sources.welcomeEmailEnabled}
                  onChange={(value) => state.updateForm("welcomeEmailEnabled", value)}
                  onReset={() => state.resetField("welcomeEmailEnabled")}
                />
                <FieldError>
                  {state.error ? translateWebError(state.error, errorT, "unknown") : null}
                </FieldError>
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LockKey aria-hidden="true" />
                {canWrite ? t("ownerOnlyWriteAccess") : t("readOnlyAdministrators")}
              </div>
              <Button disabled={!canWrite || !state.hasChanges || state.isSaving} type="submit">
                {state.isSaving ? (
                  <CircleNotch
                    className="animate-spin"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                ) : (
                  <FloppyDisk data-icon="inline-start" aria-hidden="true" />
                )}
                {t("savePolicy")}
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : (
        <SettingsUnavailable
          error={state.error ? translateWebError(state.error, errorT, "unknown") : null}
          fallback={t("authSettingsFallback")}
          onRetry={() => void state.reload()}
          title={t("authSettingsUnavailable")}
        />
      )}
    </>
  );
}

function PolicyToggle({
  canWrite,
  checked,
  description,
  inherited,
  label,
  onChange,
  onReset,
  source,
}: {
  canWrite: boolean;
  checked: boolean;
  description: string;
  inherited: boolean;
  label: string;
  onChange: (value: boolean) => void;
  onReset: () => void;
  source: SettingSource;
}) {
  const t = useTranslations("admin");
  return (
    <Field orientation="horizontal" data-disabled={!canWrite || undefined}>
      <div className="flex flex-col gap-1">
        <SettingFieldHeading canWrite={canWrite} label={label} source={source} onReset={onReset} />
        <FieldDescription>
          {description} {t("resetRestores", { value: formatValue(inherited, t) })}
        </FieldDescription>
      </div>
      <Button
        aria-pressed={checked}
        disabled={!canWrite}
        type="button"
        variant={checked ? "primary" : "outline"}
        onClick={() => onChange(!checked)}
      >
        {checked ? t("enabled") : t("disabled")}
      </Button>
    </Field>
  );
}

function formatDomains(domains: string[], t: WebTranslator<"admin">): string {
  return domains.length === 0 ? t("everyDomainDefault") : domains.join(", ");
}
