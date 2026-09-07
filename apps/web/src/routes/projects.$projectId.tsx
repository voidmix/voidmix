import { createFileRoute } from "@tanstack/react-router";
import { ProjectPage } from "../features/projects/project-page";
import { projectSearch } from "../features/projects/types";

export const Route = createFileRoute("/projects/$projectId")({
  validateSearch: projectSearch,
  component: ProjectRoute,
});

function ProjectRoute() {
  return (
    <ProjectPage key={Route.useParams().projectId} {...Route.useParams()} {...Route.useSearch()} />
  );
}
