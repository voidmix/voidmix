import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

const ProjectDetailPage = lazyRouteComponent(
  () => import("../features/projects/detail-page"),
  "ProjectDetailPage",
);

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const { projectId } = Route.useParams();
  return <ProjectDetailPage projectId={projectId} />;
}
