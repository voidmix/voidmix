import {
  createAuthSettingsAdministration,
  createMailSettingsAdministration,
  createPublicAuthCapabilities,
  createUserAdministration,
  type AuthSettings,
  type MailSettingsFallback,
  type SystemSettingsRepository,
  type UserRepository,
  type ActivityV2Repository,
} from "@voidmix/core";
import type { Locale } from "@voidmix/i18n/types";
import type { Mailer } from "@voidmix/mail/types";
import type { AgentRunApplication, ProjectApplication } from "@voidmix/application";

export interface CreateApiModulesOptions {
  v2Projects?: ProjectApplication;
  v2AgentRuns?: AgentRunApplication;
  users: UserRepository;
  settings: SystemSettingsRepository;
  mailFallback: MailSettingsFallback;
  mailer: Mailer;
  now?: () => Date;
  id?: () => string;
  resolveAuthSettings?: () => Promise<AuthSettings>;
  activity?: ActivityV2Repository;
}

export interface ApiModules {
  v2Projects?: ProjectApplication;
  v2AgentRuns?: AgentRunApplication;
  users: ReturnType<typeof createUserAdministration>;
  settings: {
    auth: ReturnType<typeof createAuthSettingsAdministration>;
    mail: ReturnType<typeof createMailSettingsAdministration>;
  };
  publicAuthCapabilities: ReturnType<typeof createPublicAuthCapabilities>;
  activity?: ActivityV2Repository;
}

export function createApiModules(options: CreateApiModulesOptions): ApiModules {
  return {
    ...(options.v2Projects ? { v2Projects: options.v2Projects } : {}),
    ...(options.v2AgentRuns ? { v2AgentRuns: options.v2AgentRuns } : {}),
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
        sendTest: (input) =>
          options.mailer.sendTest({
            email: input.email,
            name: input.name,
            ...(input.locale ? { locale: input.locale as Locale } : {}),
          }),
        ...(options.now ? { now: options.now } : {}),
        ...(options.id ? { id: options.id } : {}),
      }),
    },
    publicAuthCapabilities: createPublicAuthCapabilities({
      settings: options.settings,
      mailFallback: options.mailFallback,
      ...(options.resolveAuthSettings ? { resolveAuthSettings: options.resolveAuthSettings } : {}),
    }),
    ...(options.activity ? { activity: options.activity } : {}),
  };
}
