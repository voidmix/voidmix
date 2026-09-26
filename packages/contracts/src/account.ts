import { procedure } from "./common.js";
import { z } from "zod";

export const roleSchema = z.enum(["user", "admin", "owner"]);

export const userStatusSchema = z.enum(["active", "suspended"]);

export const accountProfileSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  displayName: z.string().min(1),
});

export const userSchema = accountProfileSchema.extend({
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

export const publicAuthCapabilitiesSchema = z.object({
  registrationAvailable: z.boolean(),
  verificationEmailRequestAvailable: z.boolean(),
  passwordResetRequestAvailable: z.boolean(),
});

export const health = procedure(
  {},
  z.object({
    status: z.literal("ok"),
    timestamp: z.date(),
  }),
);

export const listUsers = procedure(
  {
    query: z.string().trim().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().optional(),
  },
  userPageSchema,
);

export const getUser = procedure({ userId: z.string().min(1) }, userSchema);

export const updateUserStatus = procedure(
  {
    userId: z.string().min(1),
    status: userStatusSchema,
  },
  userSchema,
);

export const listAudit = procedure(
  { limit: z.number().int().min(1).max(100).default(50) },
  z.array(auditEventSchema),
);

export const getPublicAuthCapabilities = procedure({}, publicAuthCapabilitiesSchema);

export const getAccountProfile = procedure({}, accountProfileSchema);

export const listActivity = procedure(
  { projectId: z.string().min(1).optional() },
  z.object({ items: z.array(z.unknown()), nextCursor: z.string().nullable() }),
);

export type AccountProfileDto = z.infer<typeof accountProfileSchema>;

export type UserDto = z.infer<typeof userSchema>;

export type UserPageDto = z.infer<typeof userPageSchema>;

export type AuditEventDto = z.infer<typeof auditEventSchema>;

export type PublicAuthCapabilitiesDto = z.infer<typeof publicAuthCapabilitiesSchema>;
