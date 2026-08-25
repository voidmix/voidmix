import { defineCommand } from "citty";
import { v7 as uuidv7 } from "uuid";

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
        uuidv7,
      });
    });
  },
});

const cleanCommand = defineCommand({
  meta: { name: "clean", description: "Drop every table in a development or test database" },
  async run() {
    await runContextualAction("db clean", "database", async (context) => {
      const [{ runClean }, { resetDatabase }] = await Promise.all([
        import("./operation.js"),
        import("@voidmix/db"),
      ]);
      await runClean(context.environment, { log: context.log, reset: resetDatabase });
    });
  },
});

const pushCommand = defineCommand({
  meta: { name: "push", description: "Push the schema straight to a local database" },
  async run({ rawArgs }) {
    await runContextualAction("db push", "database", async (context) => {
      const [{ runPush }, { runCommand }] = await Promise.all([
        import("./operation.js"),
        import("../runtime/process.js"),
      ]);
      await runPush(context.environment, { ...context, runCommand }, rawArgs);
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
    clean: cleanCommand,
    migrate: migrateCommand,
    push: pushCommand,
    seed: seedCommand,
    studio: studioCommand,
  },
});
