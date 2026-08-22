import type { ProcessEnvironment } from "./env.js";
import type { ScriptsLog } from "./logger.js";

export interface RepositoryProcessDependencies {
  log: ScriptsLog;
  processEnv: ProcessEnvironment;
  repositoryRoot: string;
  runCommand(
    command: readonly string[],
    options: { cwd: string; env: NodeJS.ProcessEnv },
  ): Promise<void>;
}
