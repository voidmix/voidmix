import { useCallback, useEffect, useState } from "react";

import {
  adminAuthSettingsClient,
  type AdminAuthSettingsClient,
  type AuthSettings,
  type UpdateAuthSettings,
} from "./auth-api-adapter";

export interface AuthSettingsForm {
  registrationMode: "open" | "closed";
  allowedEmailDomains: string;
  welcomeEmailEnabled: boolean;
  verificationEmailEnabled: boolean;
  passwordResetEmailEnabled: boolean;
}

type AuthField = keyof AuthSettingsForm;

const emptyForm: AuthSettingsForm = {
  registrationMode: "open",
  allowedEmailDomains: "",
  welcomeEmailEnabled: true,
  verificationEmailEnabled: true,
  passwordResetEmailEnabled: true,
};

export function useAuthSettings(client: AdminAuthSettingsClient = adminAuthSettingsClient) {
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [form, setForm] = useState<AuthSettingsForm>(emptyForm);
  const [changes, setChanges] = useState<UpdateAuthSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySettings = useCallback((next: AuthSettings) => {
    setSettings(next);
    setForm(toAuthForm(next));
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
    <Key extends AuthField>(key: Key, value: AuthSettingsForm[Key]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setChanges((current) => {
        const next = { ...current };
        if (!settings || isEffectiveAuthValue(settings, key, value)) {
          delete next[key];
          return next;
        }
        if (key === "registrationMode") {
          next.registrationMode = { action: "set", value: value as "open" | "closed" };
        }
        if (key === "allowedEmailDomains") {
          next.allowedEmailDomains = { action: "set", value: parseDomains(String(value)) };
        }
        if (key === "welcomeEmailEnabled") {
          next.welcomeEmailEnabled = { action: "set", value: value as boolean };
        }
        if (key === "verificationEmailEnabled") {
          next.verificationEmailEnabled = { action: "set", value: value as boolean };
        }
        if (key === "passwordResetEmailEnabled") {
          next.passwordResetEmailEnabled = { action: "set", value: value as boolean };
        }
        return next;
      });
    },
    [settings],
  );

  const resetField = useCallback(
    (key: AuthField) => {
      if (!settings) return;
      const inherited = settings.inherited[key].value;
      setForm((current) => ({
        ...current,
        [key]: Array.isArray(inherited) ? inherited.join(", ") : inherited,
      }));
      setChanges((current) => ({ ...current, [key]: { action: "reset" } }));
    },
    [settings],
  );

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

  return {
    settings,
    form,
    isLoading,
    isSaving,
    hasChanges: Object.keys(changes).length > 0,
    changes,
    error,
    updateForm,
    resetField,
    save,
    reload: load,
  };
}

function toAuthForm(settings: AuthSettings): AuthSettingsForm {
  return {
    registrationMode: settings.registrationMode,
    allowedEmailDomains: settings.allowedEmailDomains.join(", "),
    welcomeEmailEnabled: settings.welcomeEmailEnabled,
    verificationEmailEnabled: settings.verificationEmailEnabled,
    passwordResetEmailEnabled: settings.passwordResetEmailEnabled,
  };
}

function isEffectiveAuthValue<Key extends AuthField>(
  settings: AuthSettings,
  key: Key,
  value: AuthSettingsForm[Key],
): boolean {
  if (key === "allowedEmailDomains") {
    return (
      JSON.stringify(parseDomains(String(value))) === JSON.stringify(settings.allowedEmailDomains)
    );
  }
  if (key === "registrationMode") return String(value) === settings.registrationMode;
  if (key === "welcomeEmailEnabled") return Boolean(value) === settings.welcomeEmailEnabled;
  if (key === "verificationEmailEnabled") {
    return Boolean(value) === settings.verificationEmailEnabled;
  }
  return Boolean(value) === settings.passwordResetEmailEnabled;
}

function parseDomains(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((domain) => domain.trim())
    .filter(Boolean);
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
  return "The authentication settings request failed.";
}
