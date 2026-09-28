import { connectDatabase, migrateDatabase } from "@voidmix/db";
import { authAccounts, users, v2Projects } from "@voidmix/db/schema";
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";

export const accounts = {
  admin: { id: "e2e-admin", email: "admin@example.test", name: "E2E Administrator" },
  member: { id: "e2e-member", email: "member@example.test", name: "E2E Member" },
} as const;
// Synthetic, test-only credentials. Never read or copy a developer account.
export const password = "Voidmix-test-login-only-2026!";
export function databaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (
    !url ||
    process.env.NODE_ENV !== "test" ||
    !/^\/voidmix_[a-z0-9_]*test$/.test(new URL(url).pathname)
  )
    throw new Error(
      "E2E requires NODE_ENV=test and TEST_DATABASE_URL pointing to a dedicated voidmix_*test database.",
    );
  return url;
}
export default async function setup() {
  const url = databaseUrl();
  await migrateDatabase(url);
  const connection = connectDatabase(url);
  try {
    await connection.db.execute(sql`truncate table users cascade`);
    const hash = await hashPassword(password);
    await connection.db.insert(users).values(
      Object.values(accounts).map((account) => ({
        id: account.id,
        email: account.email,
        displayName: account.name,
        role: account.id === accounts.admin.id ? ("owner" as const) : ("user" as const),
        emailVerified: true,
      })),
    );
    await connection.db.insert(authAccounts).values(
      Object.values(accounts).map((account) => ({
        id: `login-${account.id}`,
        accountId: account.id,
        providerId: "credential",
        userId: account.id,
        password: hash,
      })),
    );
    await connection.db.insert(users).values(
      Array.from({ length: 120 }, (_, i) => ({
        id: `e2e-person-${i.toString().padStart(3, "0")}`,
        email: `person-${i}@example.test`,
        displayName: `Directory person ${i.toString().padStart(3, "0")}`,
        status: i === 0 ? ("suspended" as const) : ("active" as const),
      })),
    );
    await connection.db.insert(v2Projects).values([
      ...Array.from({ length: 52 }, (_, i) => ({
        id: `e2e-project-${i.toString().padStart(3, "0")}`,
        title: `Admin film ${i.toString().padStart(3, "0")}`,
        createdByUserId: accounts.admin.id,
        personalOwnerId: accounts.admin.id,
      })),
      {
        id: "e2e-member-project",
        title: "Member private film",
        createdByUserId: accounts.member.id,
        personalOwnerId: accounts.member.id,
      },
    ]);
  } finally {
    await connection.close();
  }
}
