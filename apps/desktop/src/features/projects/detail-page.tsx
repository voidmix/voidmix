import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@voidmix/ui/page-header";
import { useDesktopTranslations } from "../../i18n/client";
import { loadProject, type StudioDetail } from "../../lib/projects";

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const t = useDesktopTranslations("projects");
  const [project, setProject] = useState<StudioDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "unavailable">("loading");
  useEffect(() => {
    void loadProject(projectId).then((result) => {
      setStatus(result.status);
      setProject(result.data);
    });
  }, [projectId]);
  return (
    <div className="page project-detail-page">
      <Link className="quiet-link" to="/projects">
        <ArrowLeft size={15} /> {t("backToProjects")}
      </Link>
      {status === "loading" ? (
        <p className="empty-copy">{t("loading")}</p>
      ) : status === "unavailable" || !project ? (
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
