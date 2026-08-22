import { oc } from "@orpc/contract";
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
  action: z.enum(["user.status.changed", "admin.created"]),
  targetId: z.string().min(1),
  occurredAt: z.date(),
  metadata: z.record(z.string(), z.string()),
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

export const apiContract = {
  health,
  admin: {
    users: {
      list: listUsers,
      get: getUser,
      updateStatus: updateUserStatus,
    },
    audit: {
      list: listAudit,
    },
  },
};

export type ApiContract = typeof apiContract;
export type UserDto = z.infer<typeof userSchema>;
export type UserPageDto = z.infer<typeof userPageSchema>;
export type AuditEventDto = z.infer<typeof auditEventSchema>;
