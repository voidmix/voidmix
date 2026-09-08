import { createFileRoute, Navigate } from "@tanstack/react-router";

import { ProjectPage } from "../../features/projects/project-page";
import { projectSearch } from "../../features/projects/types";

export const Route = createFileRoute("/(app)/projects/$projectId")({
  validateSearch: projectSearch,
  component: ProjectRoute,
});

function ProjectRoute() {
  const params = Route.useParams();
  const search = Route.useSearch();
  if (search.tab === "pi") {
    return (
      <Navigate
        replace
        to="/projects/$projectId"
        params={params}
        search={{ tab: "overview", filter: search.filter }}
      />
    );
  }
  return <ProjectPage key={params.projectId} {...params} {...search} />;
}
