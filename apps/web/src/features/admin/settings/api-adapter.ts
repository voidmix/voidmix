import { createApiClient, type ApiClient } from "@voidmix/client";
import { env } from "../../../env";

export type MailSettings = Awaited<ReturnType<ApiClient["admin"]["settings"]["mail"]["get"]>>;
export type UpdateMailSettings = Parameters<ApiClient["admin"]["settings"]["mail"]["update"]>[0];
export type MailTestResult = Awaited<
  ReturnType<ApiClient["admin"]["settings"]["mail"]["sendTest"]>
>;

export interface AdminMailSettingsClient {
  get(): Promise<MailSettings>;
  update(input: UpdateMailSettings): Promise<MailSettings>;
  sendTest(): Promise<MailTestResult>;
}

function createConfiguredApiClient() {
  return createApiClient({
    ...(env.VITE_API_URL ? { baseUrl: env.VITE_API_URL } : {}),
    fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
  });
}

export function createApiMailSettingsAdapter(
  api: ApiClient = createConfiguredApiClient(),
): AdminMailSettingsClient {
  return {
    get: () => api.admin.settings.mail.get({}),
    update: (input) => api.admin.settings.mail.update(input),
    sendTest: () => api.admin.settings.mail.sendTest({}),
  };
}

export const adminMailSettingsClient = createApiMailSettingsAdapter();
