import { useCallback, useEffect, useState } from "react";

import {
  adminMailSettingsClient,
  type AdminMailSettingsClient,
  type MailSettings,
  type UpdateMailSettings,
} from "./api-adapter";

export interface MailSettingsForm {
  enabled: boolean;
  from: string;
  fromName: string;
  templatesBaseUrl: string;
  resendApiKey: string;
}

type OrdinaryField = Exclude<keyof MailSettingsForm, "resendApiKey">;

const emptyForm: MailSettingsForm = {
  enabled: true,
  from: "",
  fromName: "Voidmix",
  templatesBaseUrl: "",
  resendApiKey: "",
};

export function useMailSettings(client: AdminMailSettingsClient = adminMailSettingsClient) {
  const [settings, setSettings] = useState<MailSettings | null>(null);
  const [form, setForm] = useState<MailSettingsForm>(emptyForm);
  const [changes, setChanges] = useState<UpdateMailSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySettings = useCallback((next: MailSettings) => {
    setSettings(next);
    setForm({
      enabled: next.enabled,
      from: next.from ?? "",
      fromName: next.fromName,
      templatesBaseUrl: next.templatesBaseUrl ?? "",
      resendApiKey: "",
    });
    setChanges({});
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      applySettings(await client.get());
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
    setIsLoading(false);
  }, [applySettings, client]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateForm = useCallback(
    <Key extends OrdinaryField>(key: Key, value: MailSettingsForm[Key]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setChanges((current) => {
        const next = { ...current };
        if (!settings || isEffectiveMailValue(settings, key, value)) {
          delete next[key];
          return next;
        }
        if (key === "enabled") next.enabled = { action: "set", value: value as boolean };
        if (key === "from") {
          next.from = String(value).trim()
            ? { action: "set", value: String(value).trim() }
            : { action: "reset" };
        }
        if (key === "fromName") {
          next.fromName = String(value).trim()
            ? { action: "set", value: String(value).trim() }
            : { action: "reset" };
        }
        if (key === "templatesBaseUrl") {
          next.templatesBaseUrl = String(value).trim()
            ? { action: "set", value: String(value).trim() }
            : { action: "reset" };
        }
        return next;
      });
    },
    [settings],
  );

  const resetField = useCallback(
    (key: OrdinaryField) => {
      if (!settings) return;
      const inherited = settings.inherited[key].value;
      setForm((current) => ({
        ...current,
        [key]: typeof inherited === "string" ? inherited : (inherited ?? ""),
      }));
      setChanges((current) => ({ ...current, [key]: { action: "reset" } }));
    },
    [settings],
  );

  const updateSecret = useCallback((value: string) => {
    setForm((current) => ({ ...current, resendApiKey: value }));
    setChanges((current) => {
      const next = { ...current };
      if (value.trim()) next.resendApiKey = { action: "replace", value: value.trim() };
      else delete next.resendApiKey;
      return next;
    });
  }, []);

  const resetSecret = useCallback(() => {
    setForm((current) => ({ ...current, resendApiKey: "" }));
    setChanges((current) => ({ ...current, resendApiKey: { action: "reset" } }));
  }, []);

  const save = useCallback(async () => {
    if (!settings || Object.keys(changes).length === 0) return settings;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await client.update(changes);
      applySettings(updated);
      setIsSaving(false);
      return updated;
    } catch (nextError) {
      setError(errorMessage(nextError));
      setIsSaving(false);
      throw nextError;
    }
  }, [applySettings, changes, client, settings]);

  const sendTest = useCallback(async () => {
    setIsTesting(true);
    setError(null);
    try {
      const result = await client.sendTest();
      setIsTesting(false);
      return result;
    } catch (nextError) {
      setError(errorMessage(nextError));
      setIsTesting(false);
      throw nextError;
    }
  }, [client]);

  return {
    settings,
    form,
    isLoading,
    isSaving,
    isTesting,
    hasChanges: Object.keys(changes).length > 0,
    changes,
    error,
    updateForm,
    resetField,
    updateSecret,
    resetSecret,
    save,
    sendTest,
    reload: load,
  };
}

function isEffectiveMailValue<Key extends OrdinaryField>(
  settings: MailSettings,
  key: Key,
  value: MailSettingsForm[Key],
): boolean {
  if (key === "enabled") return value === settings.enabled;
  if (key === "from") return String(value).trim() === (settings.from ?? "");
  if (key === "fromName") return String(value).trim() === settings.fromName;
  return String(value).trim() === (settings.templatesBaseUrl ?? "");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }
  return "The mail settings request failed.";
}
