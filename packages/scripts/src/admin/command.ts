import { defineCommand, type ArgsDef } from "citty";

import { runContextualAction } from "../runtime/action.js";

export const adminCreateArgs = {
  email: {
    type: "string",
    description: "Administrator email address",
    valueHint: "email",
  },
  name: {
    type: "string",
    description: "Administrator display name",
    valueHint: "name",
  },
} as const satisfies ArgsDef;

const createAdminCommand = defineCommand({
  meta: { name: "create", description: "Create an idempotent initial administrator" },
  args: adminCreateArgs,
  async run({ args }) {
    await runContextualAction("admin create", "database", async (context) => {
      const [operation, { openPostgresUsers }, domain] = await Promise.all([
        import("./operation.js"),
        import("../database/users.js"),
        import("@voidmix/domain"),
      ]);
      await operation.runCreateAdmin(
        operation.resolveAdminCreateInput(args, context.environment),
        context.environment,
        {
          createAdministration: domain.createUserAdministration,
          log: context.log,
          openUsers: openPostgresUsers,
        },
      );
    });
  },
});

export const adminCommand = defineCommand({
  meta: { name: "admin", description: "Manage Voidmix administrators" },
  subCommands: { create: createAdminCommand },
});
