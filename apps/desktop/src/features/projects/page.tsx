import { ArrowUpRight, Plus } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { useDesktopTranslations } from "../../i18n/client";
import { createProject, loadProjects, type StudioProject } from "../../lib/projects";

export function ProjectsPage() {
  const t = useDesktopTranslations("projects");
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"loading" | "loaded" | "unavailable">("loading");
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    void loadProjects().then((result) => {
      setStatus(result.status);
      if (result.data) setProjects(result.data);
    });
  }, []);
  return (
    <div className="page projects-page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} />
            {t("newProject")}
          </Button>
        }
      />
      {creating ? (
        <form
          className="project-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createProject(title).then((project) => {
              setProjects((current) => [project, ...current]);
              setTitle("");
              setCreating(false);
            });
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
          <Button type="submit" disabled={!title.trim()}>
            {t("newProject")}
          </Button>
        </form>
      ) : null}
      {status === "loading" ? <p className="empty-copy">{t("loading")}</p> : null}
      {status === "unavailable" ? (
        <p className="empty-copy">{t("unavailableDescription")}</p>
      ) : null}
      <div className="project-grid" aria-label={t("projectList")}>
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <div className="project-card-topline">
              <span>{project.stage.replace("_", " ")}</span>
              <Link
                className="icon-button"
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                aria-label={t("openProject", { title: project.title })}
              >
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <h2>{project.title}</h2>
            <p>{project.description ?? ""}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
