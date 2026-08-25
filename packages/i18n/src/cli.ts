#!/usr/bin/env bun
import { resolve } from "node:path";
import { defineCommand, runMain } from "citty";

import { defineI18nProject, generateI18n } from "./build.js";

const command = defineCommand({
  meta: { name: "i18n:generate", description: "Generate Paraglide i18n output" },
  args: {
    root: { type: "positional", description: "Application root", required: true },
  },
  async run({ args }) {
    const result = await generateI18n(defineI18nProject({ root: resolve(args.root) }));
    console.info(result.generated ? "generated i18n output" : "i18n output is current");
  },
});

void runMain(command);
