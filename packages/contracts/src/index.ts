import { error, oc } from "@orpc/contract";
import { z } from "zod";

export const roleSchema = z.enum(["user", "admin", "owner"]);
export const userStatusSchema = z.enum(["active", "suspended"]);

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  displayName: z.string().min(1),
  role: roleSchema,
  status: userStatusSchema,
  createdAt: z.date(),
});

export const userPageSchema = z.object({
  items: z.array(userSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
});

export const auditEventSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().min(1),
  action: z.enum([
    "user.status.changed",
    "admin.created",
    "system.settings.updated",
    "system.mail.test.sent",
  ]),
  targetType: z.enum(["user", "system_setting"]),
  targetId: z.string().min(1),
  targetUserId: z.string().min(1).nullable(),
  occurredAt: z.date(),
  metadata: z.record(z.string(), z.string()),
});

export const settingSourceSchema = z.enum(["database", "environment", "default", "missing"]);
const inheritedSettingSourceSchema = z.enum(["environment", "default", "missing"]);

const inheritedSettingSchema = <Value extends z.ZodType>(value: Value) =>
  z.object({ value, source: inheritedSettingSourceSchema });

const settingMutationSchema = <Value extends z.ZodType>(value: Value) =>
  z.discriminatedUnion("action", [
    z.object({ action: z.literal("set"), value }),
    z.object({ action: z.literal("reset") }),
  ]);

export const mailSettingsSchema = z.object({
  enabled: z.boolean(),
  from: z.email().nullable(),
  fromName: z.string(),
  templatesBaseUrl: z.url().nullable(),
  sources: z.object({
    enabled: settingSourceSchema,
    from: settingSourceSchema,
    fromName: settingSourceSchema,
    templatesBaseUrl: settingSourceSchema,
  }),
  inherited: z.object({
    enabled: inheritedSettingSchema(z.boolean()),
    from: inheritedSettingSchema(z.email().nullable()),
    fromName: inheritedSettingSchema(z.string().min(1)),
    templatesBaseUrl: inheritedSettingSchema(z.url().nullable()),
  }),
  resendApiKey: z.object({
    configured: z.boolean(),
    source: z.enum(["database", "environment", "missing"]),
    inheritedConfigured: z.boolean(),
  }),
  configurationState: z.enum(["ready", "disabled", "incomplete"]),
  missing: z.array(z.enum(["RESEND_API_KEY", "MAIL_FROM"])),
  updatedAt: z.date().nullable(),
});

export const updateMailSettingsSchema = z.object({
  enabled: settingMutationSchema(z.boolean()).optional(),
  from: settingMutationSchema(z.email()).optional(),
  fromName: settingMutationSchema(z.string().trim().min(1).max(200)).optional(),
  templatesBaseUrl: settingMutationSchema(z.url()).optional(),
  resendApiKey: z
    .discriminatedUnion("action", [
      z.object({ action: z.literal("replace"), value: z.string().trim().min(1).max(500) }),
      z.object({ action: z.literal("reset") }),
    ])
    .optional(),
});

export const mailTestResultSchema = z.object({
  sent: z.literal(true),
  recipient: z.email(),
  occurredAt: z.date(),
});

export const registrationModeSchema = z.enum(["open", "closed"]);

export const authSettingsSchema = z.object({
  registrationMode: registrationModeSchema,
  allowedEmailDomains: z.array(z.string().min(1).max(253)).max(100),
  welcomeEmailEnabled: z.boolean(),
  verificationEmailEnabled: z.boolean(),
  passwordResetEmailEnabled: z.boolean(),
  sources: z.object({
    registrationMode: settingSourceSchema,
    allowedEmailDomains: settingSourceSchema,
    welcomeEmailEnabled: settingSourceSchema,
    verificationEmailEnabled: settingSourceSchema,
    passwordResetEmailEnabled: settingSourceSchema,
  }),
  inherited: z.object({
    registrationMode: inheritedSettingSchema(registrationModeSchema),
    allowedEmailDomains: inheritedSettingSchema(z.array(z.string().min(1).max(253)).max(100)),
    welcomeEmailEnabled: inheritedSettingSchema(z.boolean()),
    verificationEmailEnabled: inheritedSettingSchema(z.boolean()),
    passwordResetEmailEnabled: inheritedSettingSchema(z.boolean()),
  }),
  updatedAt: z.date().nullable(),
});

export const updateAuthSettingsSchema = z.object({
  registrationMode: settingMutationSchema(registrationModeSchema).optional(),
  allowedEmailDomains: settingMutationSchema(
    z.array(z.string().trim().min(1).max(253)).max(100),
  ).optional(),
  welcomeEmailEnabled: settingMutationSchema(z.boolean()).optional(),
  verificationEmailEnabled: settingMutationSchema(z.boolean()).optional(),
  passwordResetEmailEnabled: settingMutationSchema(z.boolean()).optional(),
});

export const publicAuthCapabilitiesSchema = z.object({
  registrationAvailable: z.boolean(),
  verificationEmailRequestAvailable: z.boolean(),
  passwordResetRequestAvailable: z.boolean(),
});

const MailNotConfiguredError = error("MAIL_NOT_CONFIGURED", {
  message: "Mail configuration is not ready.",
  data: z.object({ missing: z.array(z.enum(["RESEND_API_KEY", "MAIL_FROM"])) }),
});

const health = oc.input(z.object({})).output(
  z.object({
    status: z.literal("ok"),
    timestamp: z.date(),
  }),
);

const listUsers = oc
  .input(
    z.object({
      query: z.string().trim().min(1).max(200).optional(),
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .output(userPageSchema);

const getUser = oc.input(z.object({ userId: z.string().min(1) })).output(userSchema);

const updateUserStatus = oc
  .input(
    z.object({
      userId: z.string().min(1),
      status: userStatusSchema,
    }),
  )
  .output(userSchema);

const listAudit = oc
  .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
  .output(z.array(auditEventSchema));

const getMailSettings = oc.input(z.object({})).output(mailSettingsSchema);

const updateMailSettings = oc.input(updateMailSettingsSchema).output(mailSettingsSchema);

const sendMailTest = oc
  .input(z.object({}))
  .output(mailTestResultSchema)
  .errors({ MAIL_NOT_CONFIGURED: MailNotConfiguredError });

const getAuthSettings = oc.input(z.object({})).output(authSettingsSchema);

const updateAuthSettings = oc.input(updateAuthSettingsSchema).output(authSettingsSchema);

const getPublicAuthCapabilities = oc.input(z.object({})).output(publicAuthCapabilitiesSchema);

export const apiContract = {
  health,
  public: {
    auth: {
      capabilities: {
        get: getPublicAuthCapabilities,
      },
    },
  },
  admin: {
    users: {
      list: listUsers,
      get: getUser,
      updateStatus: updateUserStatus,
    },
    audit: {
      list: listAudit,
    },
    settings: {
      auth: {
        get: getAuthSettings,
        update: updateAuthSettings,
      },
      mail: {
        get: getMailSettings,
        update: updateMailSettings,
        sendTest: sendMailTest,
      },
    },
  },
};

export type ApiContract = typeof apiContract;
export type UserDto = z.infer<typeof userSchema>;
export type UserPageDto = z.infer<typeof userPageSchema>;
export type AuditEventDto = z.infer<typeof auditEventSchema>;
export type MailSettingsDto = z.infer<typeof mailSettingsSchema>;
export type UpdateMailSettingsDto = z.infer<typeof updateMailSettingsSchema>;
export type MailTestResultDto = z.infer<typeof mailTestResultSchema>;
export type AuthSettingsDto = z.infer<typeof authSettingsSchema>;
export type UpdateAuthSettingsDto = z.infer<typeof updateAuthSettingsSchema>;
export type PublicAuthCapabilitiesDto = z.infer<typeof publicAuthCapabilitiesSchema>;
