import { createFileRoute, lazyRouteComponent, notFound } from "@tanstack/react-router";
import { loadProject } from "../../lib/projects";

export const Route = createFileRoute("/projects/$projectId")({
  ssr: false,
  loader: async ({ params, abortController }) => {
    const result = await loadProject(params.projectId, abortController.signal);
    if (result.status === "loaded" && !result.data) throw notFound();
    return result;
  },
  component: lazyRouteComponent(
    () => import("../../features/projects/detail-page"),
    "ProjectDetailPage",
  ),
  notFoundComponent: lazyRouteComponent(
    () => import("../../features/projects/detail-page"),
    "ProjectNotFound",
  ),
});
