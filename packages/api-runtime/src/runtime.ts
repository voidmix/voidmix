import { connectDatabase, PostgresUserRepository } from "@voidmix/db";
import { createLoggerConfig, type EvlogConfig } from "@voidmix/logger";
import { getMailEnv } from "@voidmix/mail/env";
import { createMailer } from "@voidmix/mail/server";

import { createApiApp } from "./app.js";
import { createApiAuth } from "./auth/config.js";
import type { ApiRuntimeEnvironment } from "./env.js";
import { createBetterAuthSessionResolver } from "./session.js";

export interface ApiRuntime {
  app: ReturnType<typeof createApiApp>;
  close(): Promise<void>;
}

export interface CreateApiRuntimeOptions {
  environment: ApiRuntimeEnvironment;
  loggerConfig?: EvlogConfig;
  onError?: (error: unknown) => void;
}

export async function createApiRuntime({
  environment,
  loggerConfig = createLoggerConfig({
    service: "api",
    environment: environment.NODE_ENV,
    ...(environment.LOG_PRETTY !== undefined ? { pretty: environment.LOG_PRETTY } : {}),
    ...(environment.LOG_LEVEL !== undefined ? { minLevel: environment.LOG_LEVEL } : {}),
  }),
  onError,
}: CreateApiRuntimeOptions): Promise<ApiRuntime> {
  const connection = connectDatabase(environment.DATABASE_URL);

  try {
    const mailer = createMailer({
      env: getMailEnv({
        NODE_ENV: environment.NODE_ENV,
        MAIL_FROM: environment.MAIL_FROM,
        MAIL_FROM_NAME: environment.MAIL_FROM_NAME,
        RESEND_API_KEY: environment.RESEND_API_KEY,
        EMAIL_TEMPLATES_BASE_URL: environment.EMAIL_TEMPLATES_BASE_URL,
      }),
    });
    const auth = createApiAuth({ connection, environment, mailer });
    let closePromise: Promise<void> | undefined;

    return {
      app: createApiApp({
        users: new PostgresUserRepository(connection.db),
        allowedOrigins: environment.ALLOWED_ORIGINS,
        authHandler: auth.handler,
        resolveSession: createBetterAuthSessionResolver(auth),
        loggerConfig,
        ...(onError ? { onError } : {}),
      }),
      close(): Promise<void> {
        closePromise ??= connection.close();
        return closePromise;
      },
    };
  } catch (error) {
    await connection.close();
    throw error;
  }
}
