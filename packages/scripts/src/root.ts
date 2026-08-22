import { defineCommand } from "citty";

export const rootCommand = defineCommand({
  meta: {
    name: "vmx",
    version: "0.0.0",
    description: "Voidmix repository automation",
  },
  subCommands: {
    env: () => import("./commands/env.js").then(({ envCommand }) => envCommand),
    doctor: () => import("./doctor/command.js").then(({ doctorCommand }) => doctorCommand),
    policy: () => import("./policy/command.js").then(({ policyCommand }) => policyCommand),
    clean: () => import("./commands/clean.js").then(({ cleanCommand }) => cleanCommand),
    db: () => import("./database/command.js").then(({ databaseCommand }) => databaseCommand),
    admin: () => import("./admin/command.js").then(({ adminCommand }) => adminCommand),
    generate: () => import("./commands/generate.js").then(({ generateCommand }) => generateCommand),
    desktop: () => import("./commands/desktop.js").then(({ desktopCommand }) => desktopCommand),
    verify: () => import("./commands/verify.js").then(({ verifyCommand }) => verifyCommand),
    shadcn: () => import("./commands/shadcn.js").then(({ shadcnCommand }) => shadcnCommand),
  },
});
