import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { loadProjects } from "../../lib/projects";

export const Route = createFileRoute("/projects/")({
  ssr: false,
  loader: ({ abortController }) => loadProjects(abortController.signal),
  component: lazyRouteComponent(() => import("../../features/projects/page"), "ProjectsPage"),
});
