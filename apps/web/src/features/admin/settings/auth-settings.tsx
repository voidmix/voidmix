import { CircleNotch, FloppyDisk, LockKey, ShieldCheck } from "@phosphor-icons/react";
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
        title: "Authentication policy saved",
        description: "Only changed database overrides were updated.",
        type: "success",
      });
    } catch {
      toast.add({
        title: "Could not save authentication policy",
        description: "Review the allowed domains and try again.",
        type: "error",
        priority: "high",
      });
    }
  }

  return (
    <>
      <SettingsPageHeader
        description="Manage database overrides while keeping the built-in policy visible."
        title="Authentication policy"
      />

      <SettingsNavigation current="auth" />

      {state.isLoading ? (
        <SettingsLoading label="authentication policy" />
      ) : state.settings ? (
        <form className="grid gap-5" onSubmit={(event) => void handleSave(event)}>
          <Card>
            <CardHeader>
              <CardTitle>Registration access</CardTitle>
              <CardDescription>
                Reset removes a database override and restores the built-in default.
              </CardDescription>
              <CardAction>
                <Badge variant={state.form.registrationMode === "open" ? "secondary" : "outline"}>
                  {state.form.registrationMode === "open" ? "Open" : "Closed"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal" data-disabled={!canWrite || undefined}>
                  <div className="flex flex-col gap-1">
                    <SettingFieldHeading
                      canWrite={canWrite}
                      label="Account registration"
                      source={state.settings.sources.registrationMode}
                      onReset={() => state.resetField("registrationMode")}
                    />
                    <FieldDescription>
                      A closed policy affects new accounts only. Reset restores{" "}
                      {formatValue(state.settings.inherited.registrationMode.value)} from{" "}
                      {sourceLabel(state.settings.inherited.registrationMode.source).toLowerCase()}.
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
                      ? "Registration open"
                      : "Open registration"}
                  </Button>
                </Field>
                <Field data-disabled={!canWrite || undefined}>
                  <SettingFieldHeading
                    canWrite={canWrite}
                    htmlFor="allowed-email-domains"
                    label="Allowed email domains"
                    source={state.settings.sources.allowedEmailDomains}
                    onReset={() => state.resetField("allowedEmailDomains")}
                  />
                  <Input
                    disabled={!canWrite}
                    id="allowed-email-domains"
                    placeholder="example.com, studio.example"
                    value={state.form.allowedEmailDomains}
                    onChange={(event) =>
                      state.updateForm("allowedEmailDomains", event.target.value)
                    }
                  />
                  <FieldDescription>
                    Comma or newline separated exact domains. An empty list allows every domain.
                    Reset restores{" "}
                    {formatDomains(state.settings.inherited.allowedEmailDomains.value)}.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication email behavior</CardTitle>
              <CardDescription>
                These policy values stay on the server. Public pages receive only derived
                availability booleans.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <PolicyToggle
                  canWrite={canWrite}
                  checked={state.form.verificationEmailEnabled}
                  description="Controls registration verification and verification-email resend requests."
                  inherited={state.settings.inherited.verificationEmailEnabled.value}
                  label="Verification emails"
                  source={state.settings.sources.verificationEmailEnabled}
                  onChange={(value) => state.updateForm("verificationEmailEnabled", value)}
                  onReset={() => state.resetField("verificationEmailEnabled")}
                />
                <PolicyToggle
                  canWrite={canWrite}
                  checked={state.form.passwordResetEmailEnabled}
                  description="Controls requests that send reset links. Existing reset links remain valid."
                  inherited={state.settings.inherited.passwordResetEmailEnabled.value}
                  label="Password reset emails"
                  source={state.settings.sources.passwordResetEmailEnabled}
                  onChange={(value) => state.updateForm("passwordResetEmailEnabled", value)}
                  onReset={() => state.resetField("passwordResetEmailEnabled")}
                />
                <PolicyToggle
                  canWrite={canWrite}
                  checked={state.form.welcomeEmailEnabled}
                  description="Welcome mail remains a non-critical side effect after successful verification."
                  inherited={state.settings.inherited.welcomeEmailEnabled.value}
                  label="Welcome emails"
                  source={state.settings.sources.welcomeEmailEnabled}
                  onChange={(value) => state.updateForm("welcomeEmailEnabled", value)}
                  onReset={() => state.resetField("welcomeEmailEnabled")}
                />
                <FieldError>{state.error}</FieldError>
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LockKey aria-hidden="true" />
                {canWrite ? "Owner-only write access" : "Read-only for administrators"}
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
                Save policy
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : (
        <SettingsUnavailable
          error={state.error}
          fallback="The API did not return authentication settings."
          onRetry={() => void state.reload()}
          title="Authentication policy unavailable"
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
  return (
    <Field orientation="horizontal" data-disabled={!canWrite || undefined}>
      <div className="flex flex-col gap-1">
        <SettingFieldHeading canWrite={canWrite} label={label} source={source} onReset={onReset} />
        <FieldDescription>
          {description} Reset restores {formatValue(inherited)}.
        </FieldDescription>
      </div>
      <Button
        aria-pressed={checked}
        disabled={!canWrite}
        type="button"
        variant={checked ? "primary" : "outline"}
        onClick={() => onChange(!checked)}
      >
        {checked ? "Enabled" : "Disabled"}
      </Button>
    </Field>
  );
}

function formatDomains(domains: string[]): string {
  return domains.length === 0 ? "the every-domain default" : domains.join(", ");
}
