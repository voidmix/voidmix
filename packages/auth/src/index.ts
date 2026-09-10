import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer, deviceAuthorization } from 'better-auth/plugins'
import type { Database } from '@voidmix/db'
import * as schema from '@voidmix/db/schema'
import { trustedOrigins, type ServerConfig } from '@voidmix/config/server'
export function createAuth(options: {
  db: Database
  config: ServerConfig
  sendEmail: (mail: { to: string; subject: string; text: string }) => Promise<void>
  audit: (event: { actorId?: string; action: string; resource: string }) => Promise<void>
}) {
  const { config } = options
  return betterAuth({
    appName: 'Voidmix',
    logger: { disabled: true },
    baseURL: config.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(options.db, { provider: 'pg', schema }),
    trustedOrigins: trustedOrigins(config),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) =>
        options.sendEmail({
          to: user.email,
          subject: 'Reset your Voidmix password',
          text: `Reset your password: ${url}`,
        }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        options.sendEmail({
          to: user.email,
          subject: 'Verify your Voidmix email',
          text: `Verify your email: ${url}`,
        }),
    },
    socialProviders:
      config.OAUTH_GITHUB_CLIENT_ID && config.OAUTH_GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: config.OAUTH_GITHUB_CLIENT_ID,
              clientSecret: config.OAUTH_GITHUB_CLIENT_SECRET,
            },
          }
        : {},
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/send-verification-email': { window: 60, max: 3 },
        '/request-password-reset': { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: config.NODE_ENV === 'production',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) =>
            options.audit({ actorId: user.id, action: 'account.created', resource: user.id }),
        },
      },
      session: {
        create: {
          after: async (session) =>
            options.audit({
              actorId: session.userId,
              action: 'session.created',
              resource: session.id,
            }),
        },
        delete: {
          after: async (session) =>
            options.audit({
              actorId: session.userId,
              action: 'session.revoked',
              resource: session.id,
            }),
        },
      },
    },
    plugins: [
      bearer(),
      deviceAuthorization({
        verificationUri: `${config.BETTER_AUTH_URL}/device`,
        validateClient: (clientId) => clientId === 'voidmix-desktop',
        expiresIn: '10m',
        interval: '5s',
      }),
    ],
  })
}
export type Auth = ReturnType<typeof createAuth>
