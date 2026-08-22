import { apiUsersAdapter } from "./api-adapter";
import { createFallbackUsersAdapter } from "./fallback-adapter";
import { createPreviewUsersAdapter } from "./preview-adapter";

export type { AdminUser, AdminUsersClient, UserListInput, UserRole, UserStatus } from "./types";

const previewUsersAdapter = createPreviewUsersAdapter();

export const adminUsersClient = createFallbackUsersAdapter({
  api: apiUsersAdapter,
  preview: previewUsersAdapter,
});
