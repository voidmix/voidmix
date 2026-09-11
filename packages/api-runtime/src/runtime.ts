import {
  connectDatabase,
  PostgresAgentLeaseRepository,
  PostgresAgentCommandRepository,
  PostgresAgentRunRepository,
  PostgresAgentStepRepository,
  createPostgresAssetRepositories,
  PostgresSystemSettingsRepository,
  PostgresUserRepository,
  PostgresWorkspaceMembershipRepository,
  PostgresProjectRepository,
  PostgresReviewRepository,
  PostgresFeedbackRepository,
  PostgresActivityRepository,
  PostgresPiSessionRepository,
  PostgresPiSessionEventRepository,
  PostgresAssetReferenceRepository,
  PostgresProjectMemberRepository,
  FileSystemBlobStorageRepository,
} from "@voidmix/db";
import { createRedisCache, type RedisCacheConnection } from "@voidmix/cache";
import type { AuthSettings, MailSettingsFallback } from "@voidmix/core";
import { createLoggerConfig, type EvlogConfig } from "@voidmix/logger";
import { getMailEnv } from "@voidmix/mail/env";
import { createMailer } from "@voidmix/mail/server";

import { createApiApp } from "./app.js";
import { createApiAuth } from "./auth/config.js";
import type { ApiRuntimeEnvironment } from "./env.js";
import { createApiModules } from "./modules.js";
import { createBetterAuthSessionResolver } from "./session.js";

export interface ApiRuntime {
  app: ReturnType<typeof createApiApp>;
  close(): Promise<void>;
}

export interface CreateApiRuntimeOptions {
  environment: ApiRuntimeEnvironment;
  loggerConfig?: EvlogConfig;
}

export async function createApiRuntime({
  environment,
  loggerConfig = createLoggerConfig({
    service: "api",
    environment: environment.NODE_ENV,
    ...(environment.LOG_PRETTY !== undefined ? { pretty: environment.LOG_PRETTY } : {}),
    ...(environment.LOG_LEVEL !== undefined ? { minLevel: environment.LOG_LEVEL } : {}),
  }),
}: CreateApiRuntimeOptions): Promise<ApiRuntime> {
  const connection = connectDatabase(environment.DATABASE_URL);
  let cacheConnection: RedisCacheConnection | undefined;

  try {
    if (environment.REDIS_URL && environment.NODE_ENV !== "test") {
      cacheConnection = await createRedisCache({
        url: environment.REDIS_URL,
        prefix: environment.CACHE_PREFIX,
        connectTimeoutMs: environment.CACHE_REDIS_CONNECT_TIMEOUT_MS,
        operationTimeoutMs: environment.CACHE_REDIS_OPERATION_TIMEOUT_MS,
        maxRetriesPerRequest: environment.CACHE_REDIS_MAX_RETRIES_PER_REQUEST,
      });
    }
    const mailEnvironment = getMailEnv({
      NODE_ENV: environment.NODE_ENV,
      MAIL_FROM: environment.MAIL_FROM,
      MAIL_FROM_NAME: environment.MAIL_FROM_NAME,
      RESEND_API_KEY: environment.RESEND_API_KEY,
      EMAIL_TEMPLATES_BASE_URL: environment.EMAIL_TEMPLATES_BASE_URL,
      MAIL_DEFAULT_LOCALE: environment.MAIL_DEFAULT_LOCALE,
    });
    const mailFallback = toMailFallback(environment);
    const settings = new PostgresSystemSettingsRepository(connection.db);
    const mailer = createMailer({
      env: mailEnvironment,
      resolveConfiguration: async () => {
        const configuration = await settings.resolveMailConfiguration(mailFallback);
        return {
          enabled: configuration.settings.enabled,
          from: configuration.settings.from,
          fromName: configuration.settings.fromName,
          templatesBaseUrl: configuration.settings.templatesBaseUrl,
          resendApiKey: configuration.resendApiKey,
        };
      },
    });
    const authPolicyKey = "auth-policy:v1";
    const getAuthSettings = async (): Promise<AuthSettings> => {
      if (!cacheConnection) return settings.resolveAuthSettings();
      // AuthSettings contains a native Date, while the generic cache stores
      // JSON. Convert at the boundary so callers always receive domain types.
      const cached = await cacheConnection.cache.remember(authPolicyKey, 30, async () => {
        const resolved = await settings.resolveAuthSettings();
        return {
          ...resolved,
          updatedAt: resolved.updatedAt?.toISOString() ?? null,
        };
      });
      return {
        ...cached,
        updatedAt: cached.updatedAt === null ? null : new Date(cached.updatedAt),
      };
    };
    const invalidateAuthSettings = () =>
      // Surface Redis invalidation failures: a successful settings write must
      // not claim success when other API instances may keep stale policy.
      cacheConnection
        ? cacheConnection.cache.forget(authPolicyKey).then(() => undefined)
        : Promise.resolve();
    const auth = createApiAuth({
      connection,
      environment,
      mailer,
      getAuthSettings,
      ...(cacheConnection ? { secondaryStorage: cacheConnection.secondaryStorage } : {}),
    });
    const authHandler = createMailProtectedAuthHandler({
      handler: auth.handler,
      getAuthSettings,
      getMailSettings: async () => (await settings.resolveMailConfiguration(mailFallback)).settings,
    });
    const modules = createApiModules({
      users: new PostgresUserRepository(connection.db),
      workspaceMemberships: new PostgresWorkspaceMembershipRepository(connection.db),
      settings,
      mailFallback,
      mailer,
      resolveAuthSettings: getAuthSettings,
      assets: createPostgresAssetRepositories(connection.db),
      agents: {
        runs: new PostgresAgentRunRepository(connection.db),
        steps: new PostgresAgentStepRepository(connection.db),
        leases: new PostgresAgentLeaseRepository(connection.db),
        commands: new PostgresAgentCommandRepository(connection.db),
      },
      projects: new PostgresProjectRepository(connection.db),
      projectStudioRepositories: {
        reviews: new PostgresReviewRepository(connection.db),
        feedback: new PostgresFeedbackRepository(connection.db),
        activity: new PostgresActivityRepository(connection.db),
        piSessions: new PostgresPiSessionRepository(connection.db),
        piSessionEvents: new PostgresPiSessionEventRepository(connection.db),
        assetReferences: new PostgresAssetReferenceRepository(connection.db),
        members: new PostgresProjectMemberRepository(connection.db),
      },
      ...(environment.BLOB_STORAGE_DIR
        ? { blobStorage: new FileSystemBlobStorageRepository(environment.BLOB_STORAGE_DIR) }
        : {}),
    });
    let closePromise: Promise<void> | undefined;

    return {
      app: createApiApp({
        modules,
        allowedOrigins: environment.ALLOWED_ORIGINS,
        authHandler,
        resolveSession: createBetterAuthSessionResolver(auth),
        invalidateAuthSettings,
        loggerConfig,
      }),
      close(): Promise<void> {
        closePromise ??= Promise.all([
          connection.close(),
          ...(cacheConnection ? [cacheConnection.close()] : []),
        ]).then(() => undefined);
        return closePromise;
      },
    };
  } catch (error) {
    await cacheConnection?.close().catch(() => undefined);
    await connection.close();
    throw error;
  }
}

const mailProtectedAuthPaths = new Set([
  "/api/auth/sign-up/email",
  "/api/auth/request-password-reset",
  "/api/auth/send-verification-email",
]);

export function createMailProtectedAuthHandler(options: {
  handler: (request: Request) => Promise<Response>;
  getAuthSettings: () => Promise<AuthSettings>;
  getMailSettings: () => Promise<{ configurationState: "ready" | "disabled" | "incomplete" }>;
}): (request: Request) => Promise<Response> {
  return async (request) => {
    const path = new URL(request.url).pathname;
    if (request.method === "POST" && mailProtectedAuthPaths.has(path)) {
      const authSettings = await options.getAuthSettings();
      if (path === "/api/auth/sign-up/email") {
        if (authSettings.registrationMode === "closed") {
          return authPolicyResponse("REGISTRATION_DISABLED", 403);
        }
        if (!authSettings.verificationEmailEnabled) {
          return authPolicyResponse("EMAIL_VERIFICATION_DISABLED", 403);
        }
        const emailDomain = await readEmailDomain(request);
        if (
          emailDomain &&
          authSettings.allowedEmailDomains.length > 0 &&
          !authSettings.allowedEmailDomains.includes(emailDomain)
        ) {
          return authPolicyResponse("EMAIL_DOMAIN_NOT_ALLOWED", 400);
        }
      }
      if (path === "/api/auth/send-verification-email" && !authSettings.verificationEmailEnabled) {
        return authPolicyResponse("EMAIL_VERIFICATION_DISABLED", 403);
      }
      if (path === "/api/auth/request-password-reset" && !authSettings.passwordResetEmailEnabled) {
        return authPolicyResponse("PASSWORD_RESET_DISABLED", 403);
      }

      const mailSettings = await options.getMailSettings();
      if (mailSettings.configurationState !== "ready") {
        return authPolicyResponse("MAIL_NOT_CONFIGURED", 503);
      }
    }
    return options.handler(request);
  };
}

function authPolicyResponse(code: string, status: 400 | 403 | 503): Response {
  // Keep the top-level code for Better Auth's error handling while exposing the
  // same stable envelope consumed by the application clients.
  return Response.json({ code, data: { error: { code } } }, { status });
}

async function readEmailDomain(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.clone().json();
    if (typeof body !== "object" || body === null || !("email" in body)) return null;
    const email = body.email;
    if (typeof email !== "string") return null;
    const separator = email.lastIndexOf("@");
    return separator >= 0
      ? email
          .slice(separator + 1)
          .trim()
          .toLowerCase() || null
      : null;
  } catch {
    return null;
  }
}

function toMailFallback(environment: ApiRuntimeEnvironment): MailSettingsFallback {
  return {
    enabled: { value: true, source: "default" },
    from: environment.MAIL_FROM
      ? { value: environment.MAIL_FROM, source: "environment" }
      : { value: null, source: "missing" },
    fromName: environment.MAIL_FROM_NAME
      ? { value: environment.MAIL_FROM_NAME, source: "environment" }
      : { value: "Voidmix", source: "default" },
    templatesBaseUrl: environment.EMAIL_TEMPLATES_BASE_URL
      ? { value: environment.EMAIL_TEMPLATES_BASE_URL, source: "environment" }
      : { value: null, source: "missing" },
    resendApiKey: environment.RESEND_API_KEY
      ? { value: environment.RESEND_API_KEY, source: "environment" }
      : { value: null, source: "missing" },
  };
}
