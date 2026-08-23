import { createEnv, type Preset, z } from "@voidmix/env";
import { runtimeEnv } from "@voidmix/env/runtime";

export const mailEnv = {
  id: "mail",
  extends: [runtimeEnv],
  server: {
    RESEND_API_KEY: z.string().trim().min(1).optional(),
    MAIL_FROM: z.email().optional(),
    MAIL_FROM_NAME: z.string().trim().min(1).default("Voidmix"),
    EMAIL_TEMPLATES_BASE_URL: z.url().optional(),
  },
} as const satisfies Preset;

export function getMailEnv(
  runtimeEnvValues?: Record<string, string | boolean | number | undefined>,
) {
  const env = createEnv({
    extends: [mailEnv],
    ...(runtimeEnvValues ? { runtimeEnv: runtimeEnvValues } : {}),
  });

  if (env.NODE_ENV === "production") {
    const missing = [!env.RESEND_API_KEY && "RESEND_API_KEY", !env.MAIL_FROM && "MAIL_FROM"].filter(
      (value): value is string => Boolean(value),
    );
    if (missing.length > 0) {
      throw new Error(`Production mail configuration is missing: ${missing.join(", ")}`);
    }
  }

  return {
    NODE_ENV: env.NODE_ENV,
    MAIL_FROM: env.MAIL_FROM ?? "noreply@voidmix.local",
    MAIL_FROM_NAME: env.MAIL_FROM_NAME,
    ...(env.RESEND_API_KEY ? { RESEND_API_KEY: env.RESEND_API_KEY } : {}),
    ...(env.EMAIL_TEMPLATES_BASE_URL
      ? { EMAIL_TEMPLATES_BASE_URL: env.EMAIL_TEMPLATES_BASE_URL }
      : {}),
  };
}

export type MailEnvironment = ReturnType<typeof getMailEnv>;
