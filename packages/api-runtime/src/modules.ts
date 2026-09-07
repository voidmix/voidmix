import {
  createAuthSettingsAdministration,
  createMailSettingsAdministration,
  createPublicAuthCapabilities,
  createUserAdministration,
  createAssetAdministration,
  createAgentAdministration,
  type AgentRepositories,
  type AssetRepositories,
  type AuthSettings,
  type MailSettingsFallback,
  type SystemSettingsRepository,
  type UserRepository,
  createWorkspaceAccessAdministration,
  type WorkspaceMembershipRepository,
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
  /** Optional until the host wires persistent asset repositories. */
  assets?: AssetRepositories;
  /** Optional until the host wires persistent agent repositories. */
  agents?: AgentRepositories;
  /** Workspace membership is an independent authorization seam. */
  workspaceMemberships?: WorkspaceMembershipRepository;
}

export interface ApiModules {
  users: ReturnType<typeof createUserAdministration>;
  settings: {
    auth: ReturnType<typeof createAuthSettingsAdministration>;
    mail: ReturnType<typeof createMailSettingsAdministration>;
  };
  publicAuthCapabilities: ReturnType<typeof createPublicAuthCapabilities>;
  assets?: ReturnType<typeof createAssetAdministration>;
  agents?: ReturnType<typeof createAgentAdministration>;
  workspaceAccess?: ReturnType<typeof createWorkspaceAccessAdministration>;
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
    ...(options.assets
      ? {
          assets: createAssetAdministration({
            repositories: options.assets,
            ...(options.now ? { now: options.now } : {}),
            ...(options.id ? { id: options.id } : {}),
          }),
        }
      : {}),
    ...(options.agents
      ? {
          agents: createAgentAdministration({
            repositories: options.agents,
            ...(options.now ? { now: options.now } : {}),
            ...(options.id ? { id: options.id } : {}),
          }),
        }
      : {}),
    ...(options.workspaceMemberships
      ? {
          workspaceAccess: createWorkspaceAccessAdministration({
            memberships: options.workspaceMemberships,
          }),
        }
      : {}),
  };
}
