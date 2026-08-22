import { connectDatabase, PostgresUserRepository } from "@voidmix/db";
import { configureLogger, logger } from "@voidmix/logger";

import { createApiApp } from "./app.js";
import { env } from "./env.js";
import { createHeaderSessionResolver } from "./session.js";

const loggerConfig = configureLogger({
  service: "api",
  environment: env.NODE_ENV,
  ...(env.LOG_PRETTY !== undefined ? { pretty: env.LOG_PRETTY } : {}),
  ...(env.LOG_LEVEL !== undefined ? { minLevel: env.LOG_LEVEL } : {}),
});
const databaseUrl = env.DATABASE_URL;
const connection = databaseUrl ? connectDatabase(databaseUrl) : null;
let closePromise: Promise<void> | undefined;

export const apiRuntime = {
  app: createApiApp({
    ...(connection ? { users: new PostgresUserRepository(connection.db) } : {}),
    allowedOrigins: env.ALLOWED_ORIGINS,
    resolveSession: createHeaderSessionResolver({ env }),
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
