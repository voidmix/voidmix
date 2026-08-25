import type { ProcessEnvironment } from "./env.js";
import type { ScriptsLog } from "./logger.js";

export interface RepositoryCommandOptions {
  captureOutput?: boolean;
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export interface RepositoryProcessDependencies {
  log: ScriptsLog;
  processEnv: ProcessEnvironment;
  repositoryRoot: string;
  runCommand(command: readonly string[], options: RepositoryCommandOptions): Promise<void>;
}
