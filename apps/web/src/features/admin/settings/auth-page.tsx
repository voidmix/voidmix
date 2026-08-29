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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { toast } from "@voidmix/ui/toast";
import type { FormEvent, ReactNode } from "react";

import { useSession } from "../../../lib/auth-client";
import { SettingsNavigation } from "./navigation";
import { useAuthSettings } from "./use-auth-settings";

type SettingSource = "database" | "environment" | "default" | "missing";

export function AuthSettingsPage() {
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
      <header className="flex items-end justify-between py-9 pt-14 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-6 max-[760px]:pt-10">
        <div>
          <span className="text-xs font-semibold text-muted-foreground">
            Control / System settings
          </span>
          <h1 className="mt-3 text-[clamp(2.1rem,4vw,3.6rem)] leading-none font-bold tracking-[-0.04em]">
            Authentication policy
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Manage database overrides while keeping the built-in policy visible.
          </p>
        </div>
      </header>

      <SettingsNavigation current="auth" />

      {state.isLoading ? (
        <Card>
          <CardContent className="flex min-h-40 items-center justify-center text-muted-foreground">
            <CircleNotch className="animate-spin" aria-hidden="true" />
            <span className="ml-2">Loading authentication policy…</span>
          </CardContent>
        </Card>
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
                    <FieldHeading
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
                  <FieldHeading
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
        <Card>
          <CardHeader>
            <CardTitle>Authentication policy unavailable</CardTitle>
            <CardDescription>
              {state.error ?? "The API did not return authentication settings."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => void state.reload()}>
              Try again
            </Button>
          </CardFooter>
        </Card>
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
        <FieldHeading canWrite={canWrite} label={label} source={source} onReset={onReset} />
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

function FieldHeading({
  canWrite,
  htmlFor,
  label,
  onReset,
  source,
}: {
  canWrite: boolean;
  htmlFor?: string;
  label: string;
  onReset: () => void;
  source: SettingSource;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <SourceBadge source={source} />
      {canWrite && source === "database" ? (
        <Button size="xs" type="button" variant="ghost" onClick={onReset}>
          Restore default
        </Button>
      ) : null}
    </div>
  );
}

function SourceBadge({ source }: { source: SettingSource }) {
  return (
    <Badge variant={source === "database" ? "secondary" : "outline"}>{sourceLabel(source)}</Badge>
  );
}

function sourceLabel(source: SettingSource): string {
  if (source === "database") return "Database override";
  if (source === "environment") return "Environment";
  if (source === "default") return "Default";
  return "Missing";
}

function formatValue(value: ReactNode): ReactNode {
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  return value;
}

function formatDomains(domains: string[]): string {
  return domains.length === 0 ? "the every-domain default" : domains.join(", ");
}
