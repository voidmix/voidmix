import type { User, UserRepository } from "@voidmix/domain";
import { join } from "node:path";

import { assertDevelopmentDatabaseCommand, requireDatabaseUrl } from "./policy.js";
import type { UserRepositoryConnection } from "./users.js";
import type { DatabaseScriptsEnvironment } from "../env.js";
import type { ScriptsLog } from "../runtime/logger.js";
import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

interface AdministrationService {
  ensureAdmin(input: { displayName: string; email: string }): Promise<User>;
}

export interface MigrateDependencies {
  log: ScriptsLog;
  migrate(databaseUrl: string): Promise<void>;
}

export interface SeedDependencies {
  createAdministration(dependencies: { users: UserRepository }): AdministrationService;
  log: ScriptsLog;
  now(): Date;
  openUsers(databaseUrl: string): UserRepositoryConnection;
  randomUUID(): string;
}

export async function runMigrate(
  environment: DatabaseScriptsEnvironment,
  dependencies: MigrateDependencies,
): Promise<void> {
  const databaseUrl = requireDatabaseUrl(environment);
  dependencies.log("info", "db.migrate.started");
  await dependencies.migrate(databaseUrl);
  dependencies.log("info", "db.migrate.completed");
}

export async function runSeed(
  environment: DatabaseScriptsEnvironment,
  dependencies: SeedDependencies,
): Promise<void> {
  assertDevelopmentDatabaseCommand("db seed", environment);
  const connection = dependencies.openUsers(requireDatabaseUrl(environment));
  try {
    const administration = dependencies.createAdministration({ users: connection.users });
    const admin = await administration.ensureAdmin({
      email: environment.SEED_ADMIN_EMAIL,
      displayName: environment.SEED_ADMIN_NAME,
    });
    if (!(await connection.users.getByEmail("user@voidmix.local"))) {
      await connection.users.save({
        id: dependencies.randomUUID(),
        email: "user@voidmix.local",
        displayName: "Local User",
        role: "user",
        status: "active",
        createdAt: dependencies.now(),
      });
    }
    dependencies.log("info", "db.seed.completed", { adminId: admin.id });
  } finally {
    await connection.close();
  }
}

export async function runStudio(
  environment: DatabaseScriptsEnvironment,
  dependencies: RepositoryProcessDependencies,
): Promise<void> {
  assertDevelopmentDatabaseCommand("db studio", environment);
  const databaseDirectory = join(dependencies.repositoryRoot, "packages/db");
  dependencies.log("info", "db.studio.started");
  await dependencies.runCommand(
    ["bun", "run", "drizzle-kit", "studio", "--config", "drizzle.config.ts"],
    { cwd: databaseDirectory, env: dependencies.processEnv },
  );
  dependencies.log("info", "db.studio.completed");
}
