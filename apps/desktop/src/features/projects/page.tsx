import { ArrowUpRight, CalendarBlank, CheckCircle, Plus } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDesktopTranslations, useFormatter } from "../../i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import {
  createProject,
  loadProjects,
  type PreviewProject,
  type StudioProject,
} from "../../lib/project-studio";

type Project = StudioProject | PreviewProject;

export function ProjectsPage() {
  const t = useDesktopTranslations("projects");
  const formatter = useFormatter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
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
          <Button className="primary-button" variant="primary" onClick={() => setCreating(true)}>
            <Plus size={15} />
            {t("newProject")}
          </Button>
        }
      />
      <div className={`data-source ${result.status === "loaded" ? "cloud" : "demo"}`} role="status">
        {result.status === "loading"
          ? t("loading")
          : result.status === "preview"
            ? t("previewData")
            : result.status === "loaded"
              ? t("cloudData")
              : t("unavailable")}
      </div>
      {creating ? (
        <form
          className="project-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createProject(title)
              .then((project) => {
                setResult((current) => ({
                  status: "loaded",
                  data: [project, ...current.data.filter((item) => item.id !== project.id)],
                }));
                setTitle("");
                setCreating(false);
              })
              .catch(() => setResult((current) => ({ ...current, status: "unavailable" })));
          }}
        >
          <label>
            {t("title")}
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
            />
          </label>
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            {t("newProject")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
            {t("backToProjects")}
          </Button>
        </form>
      ) : null}
      {result.status === "unavailable" ? (
        <p className="empty-copy">{t("unavailableDescription")}</p>
      ) : (
        <div className="project-grid" aria-label={t("projectList")}>
          {result.data.map((project) => {
            const progress = "progress" in project ? (project.progress ?? 0) : 0;
            const preview = "titleKey" in project;
            const title = preview ? t(project.titleKey) : project.title;
            const description = preview ? t(project.descriptionKey) : (project.description ?? "");
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
                <p>{description}</p>
                <div
                  className="project-progress"
                  aria-label={t("percentComplete", { percent: Math.round(progress * 100) })}
                >
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="project-card-meta">
                  <span>
                    <CheckCircle size={14} />
                    {preview
                      ? t("taskProgress", {
                          completed: project.taskCount,
                          total: project.taskTotal,
                        })
                      : t("notAvailable")}
                  </span>
                  <span>
                    <CalendarBlank size={14} />
                    {project.deadline
                      ? formatter.dateTime(project.deadline, "short")
                      : t("noDeadline")}
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
