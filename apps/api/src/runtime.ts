import { connectDatabase, PostgresUserRepository } from "@voidmix/db";
import { configureLogger, logger } from "@voidmix/logger";
import { createMailer } from "@voidmix/mail/server";
import { getMailEnv } from "@voidmix/mail/env";

import { createApiApp } from "./app.js";
import { createApiAuth } from "./auth/config.js";
import { env } from "./env.js";
import { createBetterAuthSessionResolver } from "./session.js";

const loggerConfig = configureLogger({
  service: "api",
  environment: env.NODE_ENV,
  ...(env.LOG_PRETTY !== undefined ? { pretty: env.LOG_PRETTY } : {}),
  ...(env.LOG_LEVEL !== undefined ? { minLevel: env.LOG_LEVEL } : {}),
});
const databaseUrl = env.DATABASE_URL;
const connection = databaseUrl ? connectDatabase(databaseUrl) : null;
if (!connection) throw new Error("DATABASE_URL is required to start the API runtime.");
const mailer = createMailer({
  env: getMailEnv({
    NODE_ENV: env.NODE_ENV,
    MAIL_FROM: env.MAIL_FROM,
    MAIL_FROM_NAME: env.MAIL_FROM_NAME,
    RESEND_API_KEY: env.RESEND_API_KEY,
    EMAIL_TEMPLATES_BASE_URL: env.EMAIL_TEMPLATES_BASE_URL,
  }),
});
const auth = createApiAuth({ connection, environment: env, mailer });
let closePromise: Promise<void> | undefined;

export const apiRuntime = {
  app: createApiApp({
    users: new PostgresUserRepository(connection.db),
    allowedOrigins: env.ALLOWED_ORIGINS,
    authHandler: auth.handler,
    resolveSession: createBetterAuthSessionResolver(auth),
    loggerConfig,
    onError: (error) => {
      const log = logger({ operation: "api.error" });
      log.error(error instanceof Error ? error : String(error));
      log.emit();
    },
  }),
  close(): Promise<void> {
    closePromise ??= connection?.close() ?? Promise.resolve();
    return closePromise;
  },
};
