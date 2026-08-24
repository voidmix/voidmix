import { createApiClient, type ApiClient } from "@voidmix/client";

export type AuthSettings = Awaited<ReturnType<ApiClient["admin"]["settings"]["auth"]["get"]>>;
export type UpdateAuthSettings = Parameters<ApiClient["admin"]["settings"]["auth"]["update"]>[0];

export interface AdminAuthSettingsClient {
  get(): Promise<AuthSettings>;
  update(input: UpdateAuthSettings): Promise<AuthSettings>;
}

function createConfiguredApiClient() {
  return createApiClient({
    fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
  });
}

export function createApiAuthSettingsAdapter(
  api: ApiClient = createConfiguredApiClient(),
): AdminAuthSettingsClient {
  return {
    get: () => api.admin.settings.auth.get({}),
    update: (input) => api.admin.settings.auth.update(input),
  };
}

export const adminAuthSettingsClient = createApiAuthSettingsAdapter();
