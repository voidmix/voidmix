import { ArrowLeft } from "@phosphor-icons/react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useDesktopTranslations } from "../../i18n/client";

const route = getRouteApi("/projects/$projectId");

export function ProjectDetailPage() {
  const t = useDesktopTranslations("projects");
  const { data: project } = route.useLoaderData();
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
              label={t(
                project.stage === "draft"
                  ? "draft"
                  : project.stage === "in_progress"
                    ? "in_progress"
                    : project.stage === "review"
                      ? "review"
                      : "delivered",
              )}
              tone={
                project.stage === "delivered"
                  ? "complete"
                  : project.stage === "draft"
                    ? "neutral"
                    : "active"
              }
            />
          }
        />
      )}
    </div>
  );
}

export function ProjectNotFound() {
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
