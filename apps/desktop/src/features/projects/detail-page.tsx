import { ArrowLeft } from "@phosphor-icons/react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { PageHeader } from "@voidmix/ui/page-header";
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
          title={project.title}
          description={project.description ?? ""}
          action={<span>{project.stage.replace("_", " ")}</span>}
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
      <PageHeader title={t("missing")} />
    </div>
  );
}
