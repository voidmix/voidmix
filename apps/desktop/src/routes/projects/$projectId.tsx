import { loadProject } from "../../lib/projects";
import { ArrowLeft } from "@phosphor-icons/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useDesktopTranslations } from "../../i18n/client";

export const Route = createFileRoute("/projects/$projectId")({
  ssr: false,
  loader: async ({ params, abortController }) => {
    const result = await loadProject(params.projectId, abortController.signal);
    if (result.status === "loaded" && !result.data) throw notFound();
    return result;
  },
  component: ProjectDetailPage,
  notFoundComponent: ProjectNotFound,
});

function ProjectDetailPage() {
  const t = useDesktopTranslations("projects");
  const { data: project } = Route.useLoaderData();
  return (
    <div className="page project-detail-page">
      <Link className="quiet-link" to="/projects">
        <ArrowLeft size={15} /> {t("backToProjects")}
      </Link>
      {!project ? (
        <p className="empty-copy">{t("unavailableDescription")}</p>
      ) : (
        <PageHeader
          className="mb-7"
          title={project.title}
          description={project.description ?? ""}
          action={
            <StatusBadge
              label={t(project.stage)}
              tone={
                project.stage === "delivered"
                  ? "success"
                  : project.stage === "draft"
                    ? "neutral"
                    : "info"
              }
            />
          }
        />
      )}
    </div>
  );
}

function ProjectNotFound() {
  const t = useDesktopTranslations("projects");
  return (
    <div className="page project-detail-page">
      <Link className="quiet-link" to="/projects">
        <ArrowLeft size={15} /> {t("backToProjects")}
      </Link>
      <PageHeader className="mb-7" title={t("missing")} />
    </div>
  );
}
