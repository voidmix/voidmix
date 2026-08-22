import { defineCommand } from "citty";

import { runContextualAction } from "../runtime/action.js";

const migrateCommand = defineCommand({
  meta: { name: "migrate", description: "Apply database migrations" },
  async run() {
    await runContextualAction("db migrate", "database", async (context) => {
      const [{ runMigrate }, { migrateDatabase }] = await Promise.all([
        import("./operation.js"),
        import("@voidmix/db"),
      ]);
      await runMigrate(context.environment, {
        log: context.log,
        migrate: migrateDatabase,
      });
    });
  },
});

const seedCommand = defineCommand({
  meta: { name: "seed", description: "Seed development or test data" },
  async run() {
    await runContextualAction("db seed", "database", async (context) => {
      const [{ runSeed }, { openPostgresUsers }, domain] = await Promise.all([
        import("./operation.js"),
        import("./users.js"),
        import("@voidmix/domain"),
      ]);
      await runSeed(context.environment, {
        createAdministration: domain.createUserAdministration,
        log: context.log,
        now: () => new Date(),
        openUsers: openPostgresUsers,
        randomUUID: () => crypto.randomUUID(),
      });
    });
  },
});

const studioCommand = defineCommand({
  meta: { name: "studio", description: "Open Drizzle Studio for a local database" },
  async run() {
    await runContextualAction("db studio", "database", async (context) => {
      const [{ runStudio }, { runCommand }] = await Promise.all([
        import("./operation.js"),
        import("../runtime/process.js"),
      ]);
      await runStudio(context.environment, { ...context, runCommand });
    });
  },
});

export const databaseCommand = defineCommand({
  meta: { name: "db", description: "Manage the Voidmix database" },
  subCommands: {
    migrate: migrateCommand,
    seed: seedCommand,
    studio: studioCommand,
  },
});
