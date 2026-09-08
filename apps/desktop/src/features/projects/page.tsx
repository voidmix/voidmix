import { ArrowUpRight, CalendarBlank, CheckCircle, Plus } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { loadProjects, type PreviewProject, type StudioProject } from "../../lib/project-studio";

type Project = StudioProject | PreviewProject;

export function ProjectsPage() {
  const t = useTranslations("projects");
  const [result, setResult] = useState<{
    status: "loading" | "preview" | "loaded" | "unavailable";
    data: Project[];
  }>({ status: "loading", data: [] });
  useEffect(() => {
    void loadProjects().then((next) =>
      setResult({ status: next.status, data: next.data ? [...next.data] : [] }),
    );
  }, []);
  return (
    <div className="page projects-page">
      <PageHeader
        className="page-header"
        title={t("title")}
        description={t("description")}
        action={
          <Button className="primary-button" variant="primary">
            <Plus size={15} />
            {t("newProject")}
          </Button>
        }
      />
      <div className={`data-source ${result.status === "loaded" ? "cloud" : "demo"}`} role="status">
        {result.status === "loading"
          ? "Loading projects…"
          : result.status === "preview"
            ? "Preview data"
            : result.status === "loaded"
              ? "Cloud data"
              : "Project data unavailable"}
      </div>
      {result.status === "unavailable" ? (
        <p className="empty-copy">
          Project data is unavailable. Check the API connection and try again.
        </p>
      ) : (
        <div className="project-grid" aria-label={t("projectList")}>
          {result.data.map((project) => {
            const progress = "progress" in project ? (project.progress ?? 0) : 0;
            const title = project.title;
            return (
              <article className="project-card" key={project.id}>
                <div className="project-card-topline">
                  <StatusBadge
                    label={t(project.stage)}
                    {...(project.stage === "review" ? { tone: "active" as const } : {})}
                  />
                  <Link
                    className="icon-button"
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    aria-label={t("openProject", { title })}
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                <h2>{title}</h2>
                <p>{project.description ?? ""}</p>
                <div className="project-progress" aria-label={`${Math.round(progress * 100)}%`}>
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="project-card-meta">
                  <span>
                    <CheckCircle size={14} />
                    {"tasks" in project ? project.tasks : "—"}
                  </span>
                  <span>
                    <CalendarBlank size={14} />
                    {project.deadline ? project.deadline.toLocaleDateString() : "No deadline"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
