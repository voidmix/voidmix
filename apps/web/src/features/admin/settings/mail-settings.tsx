import { CircleNotch, EnvelopeSimple, FloppyDisk, PaperPlaneTilt } from "@phosphor-icons/react";
import { useTranslations } from "../../../i18n/client";
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
import type { FormEvent } from "react";

import { translateWebError } from "../../../i18n/error-message";
import {
  ConfigurationBadge,
  SettingFieldHeading,
  SettingsLoading,
  SettingsPageHeader,
  SettingsUnavailable,
  SourceBadge,
  formatValue,
  sourceLabel,
} from "./components";
import { SettingsNavigation } from "./navigation";
import { useMailSettings } from "./use-mail-settings";

export function MailSettings() {
  const t = useTranslations("admin");
  const errorT = useTranslations("errors");
  const state = useMailSettings();

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await state.save();
      toast.add({
        title: t("mailSettingsSaved"),
        description: t("changedOverridesUpdated"),
        type: "success",
      });
    } catch {
      toast.add({
        title: t("mailSettingsSaveFailed"),
        description: t("reviewFieldsAndRetry"),
        type: "error",
        priority: "high",
      });
    }
  }

  async function handleTest() {
    try {
      const result = await state.sendTest();
      toast.add({
        title: t("testEmailSent"),
        description: t("testEmailSentTo", { recipient: result.recipient }),
        type: "success",
      });
    } catch {
      toast.add({
        title: t("testEmailFailed"),
        description: t("testEmailFailedDescription"),
        type: "error",
        priority: "high",
      });
    }
  }

  function handleResetSecret() {
    const fallback = state.settings?.resendApiKey.inheritedConfigured
      ? t("environmentKeyWillActivate")
      : t("noInheritedKeyWarning");
    if (window.confirm(`${t("removeResendOverrideConfirm")} ${fallback}`)) {
      state.resetSecret();
    }
  }

  return (
    <>
      <SettingsPageHeader description={t("mailSettingsDescription")} title={t("mailDelivery")} />

      <SettingsNavigation current="mail" />

      {state.isLoading ? (
        <SettingsLoading label={t("mailSettings")} />
      ) : state.settings ? (
        <form className="grid gap-5" onSubmit={(event) => void handleSave(event)}>
          <Card>
            <CardHeader>
              <CardTitle>{t("deliveryStatus")}</CardTitle>
              <CardDescription>{t("deliveryStatusDescription")}</CardDescription>
              <CardAction>
                <ConfigurationBadge state={state.settings.configurationState} />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={state.settings.resendApiKey.configured ? "secondary" : "outline"}>
                  {t("resendKeyStatus", {
                    status: state.settings.resendApiKey.configured ? t("configured") : t("missing"),
                  })}
                </Badge>
                <SourceBadge source={state.settings.resendApiKey.source} />
                {state.settings.missing.map((field) => (
                  <Badge key={field} variant="destructive">
                    {t("missingField", { field })}
                  </Badge>
                ))}
              </div>
              <Field orientation="horizontal">
                <div className="flex flex-col gap-1">
                  <SettingFieldHeading
                    label={t("mailDelivery")}
                    source={state.settings.sources.enabled}
                    resetLabel={t("restoreInheritedState")}
                    onReset={() => state.resetField("enabled")}
                  />
                  <FieldDescription>
                    {t("mailEnabledDescription", {
                      value: formatValue(state.settings.inherited.enabled.value, t),
                      source: sourceLabel(state.settings.inherited.enabled.source, t).toLowerCase(),
                    })}
                  </FieldDescription>
                </div>
                <Button
                  aria-pressed={state.form.enabled}
                  type="button"
                  variant={state.form.enabled ? "primary" : "outline"}
                  onClick={() => state.updateForm("enabled", !state.form.enabled)}
                >
                  <EnvelopeSimple data-icon="inline-start" aria-hidden="true" />
                  {state.form.enabled ? t("enabled") : t("disabled")}
                </Button>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("senderAndTemplates")}</CardTitle>
              <CardDescription>{t("senderAndTemplatesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <SettingFieldHeading
                    htmlFor="mail-from"
                    label={t("senderAddress")}
                    source={state.settings.sources.from}
                    resetLabel={t("restoreInheritedAddress")}
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
                    {t("senderAddressDescription", {
                      value: formatValue(state.settings.inherited.from.value, t),
                      source: sourceLabel(state.settings.inherited.from.source, t).toLowerCase(),
                    })}
                  </FieldDescription>
                </Field>
                <Field>
                  <SettingFieldHeading
                    htmlFor="mail-from-name"
                    label={t("senderDisplayName")}
                    source={state.settings.sources.fromName}
                    resetLabel={t("restoreInheritedName")}
                    onReset={() => state.resetField("fromName")}
                  />
                  <Input
                    id="mail-from-name"
                    value={state.form.fromName}
                    onChange={(event) => state.updateForm("fromName", event.target.value)}
                  />
                  <FieldDescription>
                    {t("senderDisplayNameDescription", {
                      value: formatValue(state.settings.inherited.fromName.value, t),
                      source: sourceLabel(
                        state.settings.inherited.fromName.source,
                        t,
                      ).toLowerCase(),
                    })}
                  </FieldDescription>
                </Field>
                <Field>
                  <SettingFieldHeading
                    htmlFor="mail-templates-url"
                    label={t("templatesBaseUrl")}
                    source={state.settings.sources.templatesBaseUrl}
                    resetLabel={t("restoreInheritedUrl")}
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
                    {t("templatesBaseUrlDescription", {
                      value: formatValue(state.settings.inherited.templatesBaseUrl.value, t),
                      source: sourceLabel(
                        state.settings.inherited.templatesBaseUrl.source,
                        t,
                      ).toLowerCase(),
                    })}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("resendCredential")}</CardTitle>
              <CardDescription>{t("resendCredentialDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <div className="flex flex-wrap items-center gap-2">
                    <FieldLabel htmlFor="resend-api-key">{t("replacementApiKey")}</FieldLabel>
                    <SourceBadge source={state.settings.resendApiKey.source} />
                  </div>
                  <Input
                    autoComplete="new-password"
                    id="resend-api-key"
                    placeholder={
                      state.settings.resendApiKey.configured
                        ? t("keepConfiguredKeyPlaceholder")
                        : t("enterResendKeyPlaceholder")
                    }
                    type="password"
                    value={state.form.resendApiKey}
                    onChange={(event) => state.updateSecret(event.target.value)}
                  />
                  <FieldDescription>{t("replacementApiKeyDescription")}</FieldDescription>
                </Field>
                {state.settings.resendApiKey.source === "database" ? (
                  <Field orientation="horizontal">
                    <div>
                      <FieldLabel>{t("removeDatabaseOverride")}</FieldLabel>
                      <FieldDescription>
                        {state.settings.resendApiKey.inheritedConfigured
                          ? t("environmentKeyAfterSave")
                          : t("noEnvironmentKeyAfterRemoval")}
                      </FieldDescription>
                    </div>
                    <Button
                      aria-pressed={state.changes.resendApiKey?.action === "reset"}
                      type="button"
                      variant="destructive"
                      onClick={handleResetSecret}
                    >
                      {state.changes.resendApiKey?.action === "reset"
                        ? t("willRestoreOnSave")
                        : t("removeOverride")}
                    </Button>
                  </Field>
                ) : null}
                <FieldError>
                  {state.error ? translateWebError(state.error, errorT, "unknown") : null}
                </FieldError>
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
                {t("sendTestEmail")}
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
                {t("saveSettings")}
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : (
        <SettingsUnavailable
          error={state.error ? translateWebError(state.error, errorT, "unknown") : null}
          fallback={t("mailSettingsFallback")}
          onRetry={() => void state.reload()}
          title={t("mailSettingsUnavailable")}
        />
      )}
    </>
  );
}
