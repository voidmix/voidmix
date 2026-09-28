import {
  createPublicAuthCapabilities,
  type AuthSettings,
  type MailSettingsFallback,
  type SystemSettingsRepository,
  type UserRepository,
} from "@voidmix/core";
import {
  createUserAdministration,
  type AgentRunApplication,
  type ProjectApplication,
  type AssetApplication,
  type ReviewApplication,
  type ActivityApplication,
} from "@voidmix/application";

export interface CreateApiModulesOptions {
  v2Projects: ProjectApplication;
  v2AgentRuns?: AgentRunApplication;
  users: UserRepository;
  settings: SystemSettingsRepository;
  mailFallback: MailSettingsFallback;
  now?: () => Date;
  id?: () => string;
  resolveAuthSettings?: () => Promise<AuthSettings>;
  assets: AssetApplication;
  reviews: ReviewApplication;
  activity: ActivityApplication;
}

export interface ApiModules {
  v2Projects: ProjectApplication;
  v2AgentRuns?: AgentRunApplication;
  users: ReturnType<typeof createUserAdministration>;
  publicAuthCapabilities: ReturnType<typeof createPublicAuthCapabilities>;
  assets: AssetApplication;
  reviews: ReviewApplication;
  activity: ActivityApplication;
}

export function createApiModules(options: CreateApiModulesOptions): ApiModules {
  return {
    v2Projects: options.v2Projects,
    assets: options.assets,
    reviews: options.reviews,
    activity: options.activity,
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
  };
}
