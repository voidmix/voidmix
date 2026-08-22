import { defineCommand } from "citty";

import { runContextualAction } from "../runtime/action.js";

const updateCommand = defineCommand({
  meta: { name: "update", description: "Update installed repository skills" },
  async run() {
    await runContextualAction("skills update", "process", async (context) => {
      const [{ runCommand }, { runSkillsUpdate }] = await Promise.all([
        import("../runtime/process.js"),
        import("./operations.js"),
      ]);
      await runSkillsUpdate({ ...context, runCommand });
    });
  },
});

export const skillsCommand = defineCommand({
  meta: { name: "skills", description: "Manage repository skills" },
  subCommands: { update: updateCommand },
});
