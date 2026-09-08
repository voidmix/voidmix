import { ArrowLeft, CalendarBlank, CheckCircle } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslations } from "@voidmix/i18n/client";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { loadProject, type PreviewProject, type StudioDetail } from "../../lib/project-studio";

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const t = useTranslations("projects");
  const [result, setResult] = useState<{
    status: "loading" | "preview" | "loaded" | "unavailable";
    data: StudioDetail | PreviewProject | null;
  }>({ status: "loading", data: null });
  useEffect(() => {
    void loadProject(projectId).then(setResult);
  }, [projectId]);
  const project = result.data;
  return (
    <div className="page project-detail-page">
      <Link className="quiet-link" to="/projects">
        <ArrowLeft size={15} /> {t("backToProjects")}
      </Link>
      <div className={`data-source ${result.status === "loaded" ? "cloud" : "demo"}`} role="status">
        {result.status === "loading"
          ? "Loading project…"
          : result.status === "preview"
            ? "Preview data"
            : result.status === "loaded"
              ? "Cloud data"
              : "Project data unavailable"}
      </div>
      {result.status === "loading" ? (
        <p className="empty-copy">Loading project…</p>
      ) : !project ? (
        <p className="empty-copy">
          {result.status === "unavailable"
            ? "Project data is unavailable. Check the API connection and try again."
            : t("missing")}
        </p>
      ) : (
        <>
          <PageHeader
            className="page-header project-detail-header"
            title={project.title}
            description={project.description ?? ""}
            action={<StatusBadge label={t(project.stage)} />}
          />
          <section className="project-detail-summary" aria-label={t("summary")}>
            <div>
              <span>{t("progress")}</span>
              <strong>
                {"progress" in project && project.progress !== null
                  ? `${Math.round(project.progress * 100)}%`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>
                <CheckCircle size={14} />
                {t("tasks")}
              </span>
              <strong>{Array.isArray(project.tasks) ? project.tasks.length : project.tasks}</strong>
            </div>
            <div>
              <span>
                <CalendarBlank size={14} />
                {t("deadline")}
              </span>
              <strong>{project.deadline ? project.deadline.toLocaleDateString() : "—"}</strong>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
