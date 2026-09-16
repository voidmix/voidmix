import { ArrowUpRight, Plus } from "@phosphor-icons/react";
import { getRouteApi, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { useDesktopTranslations } from "../../i18n/client";
import { createProject } from "../../lib/projects";

const route = getRouteApi("/projects/");

export function ProjectsPage() {
  const t = useDesktopTranslations("projects");
  const errors = useDesktopTranslations("errors");
  const router = useRouter();
  const result = route.useLoaderData();
  const projects = result.data ?? [];
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submitProject() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await createProject(title);
      await router.invalidate({ filter: (match) => match.routeId === "/projects/", sync: true });
      setTitle("");
      setCreating(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page projects-page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button onClick={() => setCreating(true)} disabled={result.status === "unavailable"}>
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
            void submitProject();
          }}
        >
          <label>
            {t("title")}
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
              disabled={saving}
            />
          </label>
          <Button type="submit" disabled={!title.trim() || saving}>
            {t("newProject")}
          </Button>
          {failed ? <p role="alert">{errors("unknown")}</p> : null}
        </form>
      ) : null}
      {result.status === "unavailable" ? (
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
