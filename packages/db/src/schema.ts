import { defineRelations } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin", "owner"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const auditActionEnum = pgEnum("audit_action", ["user.status.changed", "admin.created"]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull(),
    role: roleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("users_created_at_idx").on(table.createdAt),
    index("users_status_role_idx").on(table.status, table.role),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    action: auditActionEnum("action").notNull(),
    targetId: text("target_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, string>>().notNull(),
  },
  (table) => [
    index("audit_events_occurred_at_idx").on(table.occurredAt),
    index("audit_events_actor_id_idx").on(table.actorId),
    index("audit_events_target_id_idx").on(table.targetId),
  ],
);

export const schema = { users, auditEvents };

export const relations = defineRelations(schema, (r) => ({
  users: {
    actedAuditEvents: r.many.auditEvents({
      from: r.users.id,
      to: r.auditEvents.actorId,
      alias: "actor",
    }),
    targetedAuditEvents: r.many.auditEvents({
      from: r.users.id,
      to: r.auditEvents.targetId,
      alias: "target",
    }),
  },
  auditEvents: {
    actor: r.one.users({
      from: r.auditEvents.actorId,
      to: r.users.id,
      alias: "actor",
      optional: false,
    }),
    target: r.one.users({
      from: r.auditEvents.targetId,
      to: r.users.id,
      alias: "target",
      optional: false,
    }),
  },
}));
