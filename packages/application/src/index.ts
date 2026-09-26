import { createProjectContext } from "./context.js";
import type { ProjectOptions, ProjectApplication } from "./types.js";
import { projectsCommands } from "./projects.js";
import { membersCommands } from "./members.js";
import { resourcesCommands } from "./resources.js";
import { assetsCommands } from "./assets.js";
export { createAgentRunApplication, type AgentRunApplication } from "./agent-v2.js";

export type {
  OrganizationMemberV2Repository,
  ProjectMemberV2Repository,
  ProjectV2Repository,
  ProjectTaskV2Repository,
  FeedbackV2Repository,
  ReviewV2Repository,
} from "@voidmix/core";

export type { ProjectOptions, ProjectApplication } from "./types.js";
export function createProjectApplication(options: ProjectOptions): ProjectApplication {
  const context = createProjectContext(options);
  return {
    ...projectsCommands(context),
    ...membersCommands(context),
    ...resourcesCommands(context),
    ...assetsCommands(context),
  };
}
