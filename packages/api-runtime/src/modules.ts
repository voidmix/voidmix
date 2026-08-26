import {
  createAuthSettingsAdministration,
  createMailSettingsAdministration,
  createPublicAuthCapabilities,
  createUserAdministration,
  type AuthSettings,
  type MailSettingsFallback,
  type SystemSettingsRepository,
  type UserRepository,
} from "@voidmix/core";
import type { Mailer } from "@voidmix/mail/types";

export interface CreateApiModulesOptions {
  users: UserRepository;
  settings: SystemSettingsRepository;
  mailFallback: MailSettingsFallback;
  mailer: Mailer;
  now?: () => Date;
  id?: () => string;
  resolveAuthSettings?: () => Promise<AuthSettings>;
}

export interface ApiModules {
  users: ReturnType<typeof createUserAdministration>;
  settings: {
    auth: ReturnType<typeof createAuthSettingsAdministration>;
    mail: ReturnType<typeof createMailSettingsAdministration>;
  };
  publicAuthCapabilities: ReturnType<typeof createPublicAuthCapabilities>;
}

export function createApiModules(options: CreateApiModulesOptions): ApiModules {
  return {
    users: createUserAdministration({
      users: options.users,
      ...(options.now ? { now: options.now } : {}),
      ...(options.id ? { id: options.id } : {}),
    }),
    settings: {
      auth: createAuthSettingsAdministration({
        settings: options.settings,
        ...(options.now ? { now: options.now } : {}),
        ...(options.id ? { id: options.id } : {}),
      }),
      mail: createMailSettingsAdministration({
        settings: options.settings,
        fallback: options.mailFallback,
        sendTest: (recipient) => options.mailer.sendTest(recipient),
        ...(options.now ? { now: options.now } : {}),
        ...(options.id ? { id: options.id } : {}),
      }),
    },
    publicAuthCapabilities: createPublicAuthCapabilities({
      settings: options.settings,
      mailFallback: options.mailFallback,
      ...(options.resolveAuthSettings ? { resolveAuthSettings: options.resolveAuthSettings } : {}),
    }),
  };
}
