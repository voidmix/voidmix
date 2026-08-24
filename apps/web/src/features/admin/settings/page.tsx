import { CircleNotch, EnvelopeSimple, FloppyDisk, PaperPlaneTilt } from "@phosphor-icons/react";
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
import { toast } from "@voidmix/ui/components/ui/toast";
import type { FormEvent, ReactNode } from "react";

import { SettingsNavigation } from "./navigation";
import { useMailSettings } from "./use-mail-settings";

type SettingSource = "database" | "environment" | "default" | "missing";

export function MailSettingsPage() {
  const state = useMailSettings();

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await state.save();
      toast.add({
        title: "Mail settings saved",
        description: "Only changed database overrides were updated.",
        type: "success",
      });
    } catch {
      toast.add({
        title: "Could not save mail settings",
        description: "Review the fields and try again.",
        type: "error",
        priority: "high",
      });
    }
  }

  async function handleTest() {
    try {
      const result = await state.sendTest();
      toast.add({
        title: "Test email sent",
        description: `The message was sent to ${result.recipient}.`,
        type: "success",
      });
    } catch {
      toast.add({
        title: "Test email failed",
        description: "Mail must be enabled and fully configured before testing.",
        type: "error",
        priority: "high",
      });
    }
  }

  function handleResetSecret() {
    const fallback = state.settings?.resendApiKey.inheritedConfigured
      ? "The environment key will become active."
      : "No inherited key is configured, so mail may become incomplete.";
    if (window.confirm(`Remove the database Resend key override? ${fallback}`)) {
      state.resetSecret();
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
            Mail delivery
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Manage database overrides while keeping environment and default fallbacks visible.
          </p>
        </div>
      </header>

      <SettingsNavigation current="mail" />

      {state.isLoading ? (
        <Card>
          <CardContent className="flex min-h-40 items-center justify-center text-muted-foreground">
            <CircleNotch className="animate-spin" aria-hidden="true" />
            <span className="ml-2">Loading mail settings…</span>
          </CardContent>
        </Card>
      ) : state.settings ? (
        <form className="grid gap-5" onSubmit={(event) => void handleSave(event)}>
          <Card>
            <CardHeader>
              <CardTitle>Delivery status</CardTitle>
              <CardDescription>
                Reset removes a database override and restores its inherited value.
              </CardDescription>
              <CardAction>
                <ConfigurationBadge state={state.settings.configurationState} />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={state.settings.resendApiKey.configured ? "secondary" : "outline"}>
                  Resend key {state.settings.resendApiKey.configured ? "configured" : "missing"}
                </Badge>
                <SourceBadge source={state.settings.resendApiKey.source} />
                {state.settings.missing.map((field) => (
                  <Badge key={field} variant="destructive">
                    Missing {field}
                  </Badge>
                ))}
              </div>
              <Field orientation="horizontal">
                <div className="flex flex-col gap-1">
                  <FieldHeading
                    label="Mail delivery"
                    source={state.settings.sources.enabled}
                    resetLabel="Restore inherited state"
                    onReset={() => state.resetField("enabled")}
                  />
                  <FieldDescription>
                    Disabled mail stays unavailable even when credentials are configured. Reset uses{" "}
                    {formatValue(state.settings.inherited.enabled.value)} from{" "}
                    {sourceLabel(state.settings.inherited.enabled.source).toLowerCase()}.
                  </FieldDescription>
                </div>
                <Button
                  aria-pressed={state.form.enabled}
                  type="button"
                  variant={state.form.enabled ? "primary" : "outline"}
                  onClick={() => state.updateForm("enabled", !state.form.enabled)}
                >
                  <EnvelopeSimple data-icon="inline-start" aria-hidden="true" />
                  {state.form.enabled ? "Enabled" : "Disabled"}
                </Button>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sender and templates</CardTitle>
              <CardDescription>
                Clearing an input schedules a reset instead of storing an empty override.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldHeading
                    htmlFor="mail-from"
                    label="Sender address"
                    source={state.settings.sources.from}
                    resetLabel="Restore inherited address"
                    onReset={() => state.resetField("from")}
                  />
                  <Input
                    id="mail-from"
                    inputMode="email"
                    placeholder="mail@example.com"
                    type="email"
                    value={state.form.from}
                    onChange={(event) => state.updateForm("from", event.target.value)}
                  />
                  <FieldDescription>
                    Used as MAIL_FROM. Reset restores{" "}
                    {formatValue(state.settings.inherited.from.value)} from{" "}
                    {sourceLabel(state.settings.inherited.from.source).toLowerCase()}.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldHeading
                    htmlFor="mail-from-name"
                    label="Sender display name"
                    source={state.settings.sources.fromName}
                    resetLabel="Restore inherited name"
                    onReset={() => state.resetField("fromName")}
                  />
                  <Input
                    id="mail-from-name"
                    value={state.form.fromName}
                    onChange={(event) => state.updateForm("fromName", event.target.value)}
                  />
                  <FieldDescription>
                    Reset restores {formatValue(state.settings.inherited.fromName.value)} from{" "}
                    {sourceLabel(state.settings.inherited.fromName.source).toLowerCase()}.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldHeading
                    htmlFor="mail-templates-url"
                    label="Templates base URL"
                    source={state.settings.sources.templatesBaseUrl}
                    resetLabel="Restore inherited URL"
                    onReset={() => state.resetField("templatesBaseUrl")}
                  />
                  <Input
                    id="mail-templates-url"
                    placeholder="https://app.example.com"
                    type="url"
                    value={state.form.templatesBaseUrl}
                    onChange={(event) => state.updateForm("templatesBaseUrl", event.target.value)}
                  />
                  <FieldDescription>
                    Optional base URL. Reset restores{" "}
                    {formatValue(state.settings.inherited.templatesBaseUrl.value)} from{" "}
                    {sourceLabel(state.settings.inherited.templatesBaseUrl.source).toLowerCase()}.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resend credential</CardTitle>
              <CardDescription>
                The key remains write-only. Its original value never returns from the API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <div className="flex flex-wrap items-center gap-2">
                    <FieldLabel htmlFor="resend-api-key">Replacement API key</FieldLabel>
                    <SourceBadge source={state.settings.resendApiKey.source} />
                  </div>
                  <Input
                    autoComplete="new-password"
                    id="resend-api-key"
                    placeholder={
                      state.settings.resendApiKey.configured
                        ? "Leave blank to keep the configured key"
                        : "Enter a Resend API key"
                    }
                    type="password"
                    value={state.form.resendApiKey}
                    onChange={(event) => state.updateSecret(event.target.value)}
                  />
                  <FieldDescription>
                    Blank input preserves the current database state. A new value replaces the
                    database key.
                  </FieldDescription>
                </Field>
                {state.settings.resendApiKey.source === "database" ? (
                  <Field orientation="horizontal">
                    <div>
                      <FieldLabel>Remove database override</FieldLabel>
                      <FieldDescription>
                        {state.settings.resendApiKey.inheritedConfigured
                          ? "An environment key will become active after saving."
                          : "No environment key is available after removal."}
                      </FieldDescription>
                    </div>
                    <Button
                      aria-pressed={state.changes.resendApiKey?.action === "reset"}
                      type="button"
                      variant="destructive"
                      onClick={handleResetSecret}
                    >
                      {state.changes.resendApiKey?.action === "reset"
                        ? "Will restore on save"
                        : "Remove override"}
                    </Button>
                  </Field>
                ) : null}
                <FieldError>{state.error}</FieldError>
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-between gap-2">
              <Button
                disabled={
                  state.isTesting ||
                  state.isSaving ||
                  state.hasChanges ||
                  state.settings.configurationState !== "ready"
                }
                type="button"
                variant="outline"
                onClick={() => void handleTest()}
              >
                {state.isTesting ? (
                  <CircleNotch
                    className="animate-spin"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                ) : (
                  <PaperPlaneTilt data-icon="inline-start" aria-hidden="true" />
                )}
                Send test email
              </Button>
              <Button
                disabled={!state.hasChanges || state.isSaving || state.isTesting}
                type="submit"
              >
                {state.isSaving ? (
                  <CircleNotch
                    className="animate-spin"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                ) : (
                  <FloppyDisk data-icon="inline-start" aria-hidden="true" />
                )}
                Save settings
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Mail settings unavailable</CardTitle>
            <CardDescription>
              {state.error ?? "The API did not return mail settings."}
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

function FieldHeading({
  htmlFor,
  label,
  onReset,
  resetLabel,
  source,
}: {
  htmlFor?: string;
  label: string;
  onReset: () => void;
  resetLabel: string;
  source: SettingSource;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <SourceBadge source={source} />
      {source === "database" ? (
        <Button size="xs" type="button" variant="ghost" onClick={onReset}>
          {resetLabel}
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
  if (value === null || value === "") return "no value";
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  return value;
}

function ConfigurationBadge({ state }: { state: "ready" | "disabled" | "incomplete" }) {
  if (state === "ready") return <Badge>Ready</Badge>;
  if (state === "disabled") return <Badge variant="secondary">Disabled</Badge>;
  return <Badge variant="destructive">Incomplete</Badge>;
}
