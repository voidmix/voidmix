import * as identity from "./identity.js";
import * as projects from "./projects.js";
import * as resources from "./resources.js";
import * as legacyProjectTables from "./legacy-projects.js";
import * as legacyAssets from "./legacy-assets.js";

// The historical scheduled-task table is exported for migrations only. Preserve
// the existing runtime aggregate while leaving its persisted definition intact.
const { scheduledTasks: _scheduledTasks, ...legacyProjects } = legacyProjectTables;

export const schema = {
  ...identity,
  ...projects,
  ...resources,
  ...legacyProjects,
  ...legacyAssets,
};
