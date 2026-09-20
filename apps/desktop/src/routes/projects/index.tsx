import { ArrowUpRight, Plus } from "@phosphor-icons/react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { PageHeader } from "@voidmix/ui/page-header";
import { useDesktopTranslations } from "../../i18n/client";
import { loadProjects, createProject } from "../../lib/projects";

export const Route = createFileRoute("/projects/")({
  ssr: false,
  loader: ({ abortController }) => loadProjects(abortController.signal),
  component: ProjectsPage,
});

function ProjectsPage() {
  const t = useDesktopTranslations("projects");
  const errors = useDesktopTranslations("errors");
  const router = useRouter();
  const result = Route.useLoaderData();
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
        className="mb-7"
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
          <Field data-disabled={saving}>
            <FieldLabel htmlFor="desktop-project-title">{t("title")}</FieldLabel>
            <Input
              id="desktop-project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
              disabled={saving}
            />
          </Field>
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
                    ? "success"
                    : project.stage === "draft"
                      ? "neutral"
                      : "info"
                }
              />
              <Link
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
