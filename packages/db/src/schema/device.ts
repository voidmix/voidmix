import { index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"

import { user } from "./auth"

export const deviceCode = pgTable(
  "auth_device_code",
  {
    id: text("id").primaryKey(),
    deviceCode: varchar("device_code", { length: 191 }).notNull().unique(),
    userCode: varchar("user_code", { length: 191 }).notNull().unique(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    pollingInterval: integer("polling_interval"),
    clientId: text("client_id"),
    scope: text("scope"),
  },
  (table) => [index("auth_device_code_user_id_idx").on(table.userId)],
)
