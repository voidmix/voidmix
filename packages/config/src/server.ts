import { z } from 'zod'
const optional = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional())
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => /^postgres(ql)?:/.test(value)),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    TRUSTED_ORIGINS: z.string().default(''),
    S3_BUCKET: z.string().min(1),
    S3_REGION: z.string().default('us-east-1'),
    S3_ENDPOINT: z.string().url(),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    UPLOAD_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .max(1024 * 1024 * 1024)
      .default(25 * 1024 * 1024),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: optional,
    SMTP_PASSWORD: optional,
    MAIL_FROM: z.string().email(),
    OAUTH_GITHUB_CLIENT_ID: optional,
    OAUTH_GITHUB_CLIENT_SECRET: optional,
  })
  .superRefine((env, ctx) => {
    if (Boolean(env.OAUTH_GITHUB_CLIENT_ID) !== Boolean(env.OAUTH_GITHUB_CLIENT_SECRET))
      ctx.addIssue({
        code: 'custom',
        path: ['OAUTH_GITHUB_CLIENT_ID'],
        message: 'Configure both OAuth credentials',
      })
    if (env.NODE_ENV === 'production' && !env.BETTER_AUTH_URL.startsWith('https://'))
      ctx.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_URL'],
        message: 'Production requires HTTPS',
      })
    if (
      env.NODE_ENV === 'production' &&
      /replace|development|change-me/.test(env.BETTER_AUTH_SECRET)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_SECRET'],
        message: 'Replace the development secret',
      })
  })
export type ServerConfig = z.infer<typeof schema>
export function getServerConfig(
  env: Record<string, string | undefined> = process.env,
): ServerConfig {
  const result = schema.safeParse(env)
  // Never include raw environment values or Zod's input in startup errors.
  if (!result.success)
    throw new Error(
      `Invalid configuration: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    )
  return result.data
}
export function trustedOrigins(config: ServerConfig) {
  return [
    ...new Set([
      new URL(config.BETTER_AUTH_URL).origin,
      ...config.TRUSTED_ORIGINS.split(',')
        .filter(Boolean)
        .map((value) => new URL(value.trim()).origin),
    ]),
  ]
}
