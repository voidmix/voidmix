import { createFileRoute } from "@tanstack/react-router";

import { ProjectPage } from "../../features/projects/project-page";

export const Route = createFileRoute("/(app)/projects/$projectId")({ component: ProjectRoute });

function ProjectRoute() {
  const params = Route.useParams();
  return <ProjectPage key={params.projectId} {...params} />;
}
