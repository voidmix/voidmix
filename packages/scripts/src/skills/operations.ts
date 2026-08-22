import type { RepositoryProcessDependencies } from "../runtime/process-dependencies.js";

export async function runSkillsUpdate(dependencies: RepositoryProcessDependencies): Promise<void> {
  dependencies.log("info", "skills.update.started");
  await dependencies.runCommand(["bunx", "skills", "update", "-p", "-y"], {
    cwd: dependencies.repositoryRoot,
    env: dependencies.processEnv,
  });
  dependencies.log("info", "skills.update.completed");
}
