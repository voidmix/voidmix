import type { AuditEvent } from "../identity/model.js";
import type {
  InheritedSetting,
  SettingSource,
  UpdateSecret,
  UpdateSetting,
} from "../shared/types.js";

export interface MailRuntimeSettings {
  enabled: boolean;
  from: string | null;
  fromName: string;
  templatesBaseUrl: string | null;
  configurationState: "ready" | "disabled" | "incomplete";
  missing: Array<"RESEND_API_KEY" | "MAIL_FROM">;
}
export interface MailSettings extends MailRuntimeSettings {
  sources: {
    enabled: SettingSource;
    from: SettingSource;
    fromName: SettingSource;
    templatesBaseUrl: SettingSource;
  };
  inherited: {
    enabled: InheritedSetting<boolean>;
    from: InheritedSetting<string | null>;
    fromName: InheritedSetting<string>;
    templatesBaseUrl: InheritedSetting<string | null>;
  };
  resendApiKey: {
    configured: boolean;
    source: Extract<SettingSource, "database" | "environment" | "missing">;
    inheritedConfigured: boolean;
  };
  updatedAt: Date | null;
}
export interface MailSettingsFallback {
  enabled: InheritedSetting<boolean>;
  from: InheritedSetting<string | null>;
  fromName: InheritedSetting<string>;
  templatesBaseUrl: InheritedSetting<string | null>;
  resendApiKey: InheritedSetting<string | null>;
}
export interface MailRuntimeConfiguration {
  settings: MailRuntimeSettings;
  resendApiKey: string | null;
}
export interface UpdateMailSettingsInput {
  enabled?: UpdateSetting<boolean>;
  from?: UpdateSetting<string>;
  fromName?: UpdateSetting<string>;
  templatesBaseUrl?: UpdateSetting<string>;
  resendApiKey?: UpdateSecret;
}
export const registrationModes = ["open", "closed"] as const;
export type RegistrationMode = (typeof registrationModes)[number];
export interface AuthSettings {
  registrationMode: RegistrationMode;
  allowedEmailDomains: string[];
  welcomeEmailEnabled: boolean;
  verificationEmailEnabled: boolean;
  passwordResetEmailEnabled: boolean;
  updatedAt: Date | null;
}
export interface AuthSettingsView extends AuthSettings {
  sources: {
    registrationMode: SettingSource;
    allowedEmailDomains: SettingSource;
    welcomeEmailEnabled: SettingSource;
    verificationEmailEnabled: SettingSource;
    passwordResetEmailEnabled: SettingSource;
  };
  inherited: {
    registrationMode: InheritedSetting<RegistrationMode>;
    allowedEmailDomains: InheritedSetting<string[]>;
    welcomeEmailEnabled: InheritedSetting<boolean>;
    verificationEmailEnabled: InheritedSetting<boolean>;
    passwordResetEmailEnabled: InheritedSetting<boolean>;
  };
}
export interface UpdateAuthSettingsInput {
  registrationMode?: UpdateSetting<RegistrationMode>;
  allowedEmailDomains?: UpdateSetting<string[]>;
  welcomeEmailEnabled?: UpdateSetting<boolean>;
  verificationEmailEnabled?: UpdateSetting<boolean>;
  passwordResetEmailEnabled?: UpdateSetting<boolean>;
}
export interface PublicAuthCapabilities {
  registrationAvailable: boolean;
  verificationEmailRequestAvailable: boolean;
  passwordResetRequestAvailable: boolean;
}
export function createDefaultAuthSettings(): AuthSettings {
  return {
    registrationMode: "open",
    allowedEmailDomains: [],
    welcomeEmailEnabled: true,
    verificationEmailEnabled: true,
    passwordResetEmailEnabled: true,
    updatedAt: null,
  };
}
export interface SystemSettingsRepository {
  getAuthSettings(): Promise<AuthSettingsView>;
  resolveAuthSettings(): Promise<AuthSettings>;
  updateAuthSettings(input: {
    actorId: string;
    settings: UpdateAuthSettingsInput;
    audit: AuditEvent;
  }): Promise<AuthSettingsView>;
  getMailSettings(fallback: MailSettingsFallback): Promise<MailSettings>;
  resolveMailConfiguration(fallback: MailSettingsFallback): Promise<MailRuntimeConfiguration>;
  updateMailSettings(input: {
    actorId: string;
    settings: UpdateMailSettingsInput;
    fallback: MailSettingsFallback;
    audit: AuditEvent;
  }): Promise<MailSettings>;
  appendMailTestAudit(event: AuditEvent): Promise<void>;
}
