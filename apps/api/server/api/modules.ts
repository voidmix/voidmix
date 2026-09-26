import {
  createPublicAuthCapabilities,
  createUserAdministration,
  type AuthSettings,
  type MailSettingsFallback,
  type SystemSettingsRepository,
  type UserRepository,
  type ActivityV2Repository,
} from "@voidmix/core";
import type { AgentRunApplication, ProjectApplication } from "@voidmix/application";

export interface CreateApiModulesOptions {
  v2Projects?: ProjectApplication;
  v2AgentRuns?: AgentRunApplication;
  users: UserRepository;
  settings: SystemSettingsRepository;
  mailFallback: MailSettingsFallback;
  now?: () => Date;
  id?: () => string;
  resolveAuthSettings?: () => Promise<AuthSettings>;
  activity?: ActivityV2Repository;
}

export interface ApiModules {
  v2Projects?: ProjectApplication;
  v2AgentRuns?: AgentRunApplication;
  users: ReturnType<typeof createUserAdministration>;
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
    publicAuthCapabilities: createPublicAuthCapabilities({
      settings: options.settings,
      mailFallback: options.mailFallback,
      ...(options.resolveAuthSettings ? { resolveAuthSettings: options.resolveAuthSettings } : {}),
    }),
    ...(options.activity ? { activity: options.activity } : {}),
  };
}
