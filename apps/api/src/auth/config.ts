import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { DatabaseConnection } from "@voidmix/db";
import { authAccounts, authSessions, authVerifications, users } from "@voidmix/db/schema";
import type { Mailer } from "@voidmix/mail/types";
import { betterAuth } from "better-auth";

import type { ApiEnvironment } from "../env.js";

export interface CreateApiAuthOptions {
  connection: DatabaseConnection;
  environment: ApiEnvironment;
  mailer: Mailer;
}

export function createApiAuth({ connection, environment, mailer }: CreateApiAuthOptions) {
  const production = environment.NODE_ENV === "production";
  if (production && environment.AUTH_SECRET === "voidmix-development-secret-change-me") {
    throw new Error("AUTH_SECRET must be explicitly configured in production.");
  }
  if (production && environment.AUTH_URL.startsWith("http://localhost")) {
    throw new Error("AUTH_URL must be explicitly configured in production.");
  }
  const auth = betterAuth({
    database: drizzleAdapter(connection.db, {
      provider: "pg",
      schema: { users, authSessions, authAccounts, authVerifications },
    }),
    baseURL: environment.AUTH_URL,
    basePath: "/api/auth",
    secret: environment.AUTH_SECRET,
    trustedOrigins: [...new Set([...environment.ALLOWED_ORIGINS, environment.AUTH_URL])],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) =>
        mailer.sendPasswordReset({ email: user.email, name: user.name, url }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) =>
        mailer.sendVerification({ email: user.email, name: user.name, url }),
      afterEmailVerification: async (user) =>
        mailer.sendWelcome({ email: user.email, name: user.name }),
    },
    user: {
      modelName: "users",
      fields: { name: "displayName" },
      additionalFields: {
        role: { type: "string", required: false, input: false },
        status: { type: "string", required: false, input: false },
      },
    },
    session: { modelName: "authSessions", storeSessionInDatabase: true },
    account: { modelName: "authAccounts" },
    verification: { modelName: "authVerifications" },
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            const [existing] = await connection.db.select({ id: users.id }).from(users).limit(1);
            return {
              data: {
                ...data,
                role: existing ? "user" : "owner",
                status: "active",
              },
            };
          },
        },
      },
    },
    advanced: {
      database: { generateId: () => crypto.randomUUID(), joins: false },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: production,
        ...(environment.AUTH_DOMAIN ? { domain: environment.AUTH_DOMAIN } : {}),
      },
    },
  });

  return auth;
}

export type ApiAuth = ReturnType<typeof createApiAuth>;
