import { ArrowLeft, CalendarBlank, CheckCircle } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDesktopTranslations, useFormatter } from "../../i18n/client";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { loadProject, type PreviewProject, type StudioDetail } from "../../lib/project-studio";

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const t = useDesktopTranslations("projects");
  const formatter = useFormatter();
  const [result, setResult] = useState<{
    status: "loading" | "preview" | "loaded" | "unavailable";
    data: StudioDetail | PreviewProject | null;
  }>({ status: "loading", data: null });
  useEffect(() => {
    void loadProject(projectId).then(setResult);
  }, [projectId]);
  const project = result.data;
  const title = project ? getProjectTitle(project, t) : "";
  const description = project ? getProjectDescription(project, t) : "";
  const progress =
    project && "progress" in project && project.progress !== null
      ? t("percentComplete", { percent: Math.round(project.progress * 100) })
      : t("noProgress");
  const taskSummary = project ? getTaskSummary(project, t) : t("noTasks");
  return (
    <div className="page project-detail-page">
      <Link className="quiet-link" to="/projects">
        <ArrowLeft size={15} /> {t("backToProjects")}
      </Link>
      <div className={`data-source ${result.status === "loaded" ? "cloud" : "demo"}`} role="status">
        {result.status === "loading"
          ? t("loading")
          : result.status === "preview"
            ? t("previewData")
            : result.status === "loaded"
              ? t("cloudData")
              : t("unavailable")}
      </div>
      {result.status === "loading" ? (
        <p className="empty-copy">{t("loading")}</p>
      ) : !project ? (
        <p className="empty-copy">
          {result.status === "unavailable" ? t("unavailableDescription") : t("missing")}
        </p>
      ) : (
        <>
          <PageHeader
            className="page-header project-detail-header"
            title={title}
            description={description}
            action={<StatusBadge label={t(project.stage)} />}
          />
          <section className="project-detail-summary" aria-label={t("summary")}>
            <div>
              <span>{t("progress")}</span>
              <strong>{progress}</strong>
            </div>
            <div>
              <span>
                <CheckCircle size={14} />
                {t("tasks")}
              </span>
              <strong>{taskSummary}</strong>
            </div>
            <div>
              <span>
                <CalendarBlank size={14} />
                {t("deadline")}
              </span>
              <strong>
                {project.deadline ? formatter.dateTime(project.deadline, "short") : t("noDeadline")}
              </strong>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function isPreviewProject(project: StudioDetail | PreviewProject): project is PreviewProject {
  return "titleKey" in project;
}

function getProjectTitle(
  project: StudioDetail | PreviewProject,
  t: ReturnType<typeof useDesktopTranslations<"projects">>,
) {
  return isPreviewProject(project) ? t(project.titleKey) : project.title;
}

function getProjectDescription(
  project: StudioDetail | PreviewProject,
  t: ReturnType<typeof useDesktopTranslations<"projects">>,
) {
  return isPreviewProject(project) ? t(project.descriptionKey) : (project.description ?? "");
}

function getTaskSummary(
  project: StudioDetail | PreviewProject,
  t: ReturnType<typeof useDesktopTranslations<"projects">>,
) {
  if (isPreviewProject(project)) {
    return t("taskProgress", { completed: project.taskCount, total: project.taskTotal });
  }
  return Array.isArray(project.tasks)
    ? t("taskCount", { count: project.tasks.length })
    : t("noTasks");
}
