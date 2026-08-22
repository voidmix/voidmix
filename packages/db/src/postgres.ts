import type {
  AuditEvent,
  User,
  UserListQuery,
  UserPage,
  UserRepository,
  UserStatus,
} from "@voidmix/domain";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Sql } from "postgres";

import { auditEvents, relations, users } from "./schema.js";

export interface DatabaseConnection {
  db: PostgresJsDatabase;
  close(): Promise<void>;
}

export function connectDatabase(databaseUrl: string): DatabaseConnection {
  const client = postgres(databaseUrl, { max: 10 });
  return {
    db: drizzle({ client, relations }),
    close: () => client.end(),
  };
}

export async function migrateDatabase(
  databaseUrl: string,
  migrationsFolder = new URL("../drizzle", import.meta.url).pathname,
): Promise<void> {
  const client: Sql = postgres(databaseUrl, { max: 1 });
  try {
    await migrate(drizzle({ client, relations }), { migrationsFolder });
  } finally {
    await client.end();
  }
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async list(query: UserListQuery): Promise<UserPage> {
    const offset = parseCursor(query.cursor);
    const search = query.query
      ? or(ilike(users.email, `%${query.query}%`), ilike(users.displayName, `%${query.query}%`))
      : undefined;
    const where = search ? and(search) : undefined;
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(query.limit)
        .offset(offset),
      this.db
        .select({ value: sql<number>`count(*)::int` })
        .from(users)
        .where(where),
    ]);
    const total = totals[0]?.value ?? 0;
    const nextOffset = offset + rows.length;
    return {
      items: rows,
      total,
      nextCursor: nextOffset < total ? String(nextOffset) : null,
    };
  }

  async getById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  async countActiveAdministrators(): Promise<number> {
    const [result] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.status, "active"), inArray(users.role, ["admin", "owner"])));
    return result?.value ?? 0;
  }

  async save(user: User): Promise<void> {
    await this.db.insert(users).values({ ...user, email: user.email.toLowerCase() });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const [updated] = await this.db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Cannot update missing user ${id}`);
    }
    return updated;
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    await this.db.insert(auditEvents).values(event);
  }

  async listAudit(limit: number): Promise<AuditEvent[]> {
    return this.db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      .limit(limit);
  }
}

function parseCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const offset = Number.parseInt(cursor, 10);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}
