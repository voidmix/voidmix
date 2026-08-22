import { log } from "@voidmix/logger/client";

import type { AdminUsersClient, UserListInput, UserStatus } from "./types";

export interface FallbackLogger {
  warn(input: { event: string; reason: string }): void;
  error(input: { event: string; reason: string }): void;
}

export interface FallbackUsersAdapterOptions {
  api: AdminUsersClient;
  preview: AdminUsersClient;
  logger?: FallbackLogger;
}

export function createFallbackUsersAdapter({
  api,
  preview,
  logger = log,
}: FallbackUsersAdapterOptions): AdminUsersClient {
  return {
    async listUsers(input: UserListInput) {
      try {
        return await api.listUsers(input);
      } catch {
        logger.warn({ event: "admin.users.list.fallback", reason: "api_unavailable" });
        return preview.listUsers(input);
      }
    },
    async updateUserStatus(input: { userId: string; status: UserStatus }) {
      try {
        return await api.updateUserStatus(input);
      } catch {
        try {
          const updated = await preview.updateUserStatus(input);
          logger.warn({ event: "admin.users.update.fallback", reason: "api_unavailable" });
          return updated;
        } catch (error) {
          if (error instanceof Error && error.message === "User not found") {
            logger.error({ event: "admin.users.update.failed", reason: "user_not_found" });
          }
          throw error;
        }
      }
    },
  };
}

export type FallbackUsersAdapter = ReturnType<typeof createFallbackUsersAdapter>;
