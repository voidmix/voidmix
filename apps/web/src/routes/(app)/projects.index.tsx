import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useTranslations } from "../../i18n/client";
import { createWebApiClient } from "../../lib/api-client";

export const Route = createFileRoute("/(app)/projects/")({ component: ProjectsPage });

const api = createWebApiClient();

function ProjectsPage() {
  const t = useTranslations("projects");
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof api.projects.list>>["items"]>(
    [],
  );
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [createFailed, setCreateFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    void api.projects
      .list({})
      .then((result) => {
        if (active) setProjects(result.items);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setCreateFailed(false);
    try {
      const project = await api.projects.create({ title: title.trim() });
      setProjects((current) => [project, ...current]);
      setTitle("");
    } catch {
      setCreateFailed(true);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <PageHeader title={t("title")} description={t("description")} />
      <form onSubmit={createProject} aria-busy={saving}>
        <FieldGroup className="gap-3">
          <Field data-disabled={saving}>
            <FieldLabel htmlFor="project-title">{t("titlePlaceholder")}</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="project-title"
                className="min-w-0 flex-1 basis-48"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                disabled={saving}
                aria-describedby={createFailed ? "project-create-error" : undefined}
                placeholder={t("titlePlaceholder")}
              />
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving ? t("saving") : t("newProject")}
              </Button>
            </div>
            {createFailed ? (
              <FieldError id="project-create-error">{t("createFailed")}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </form>
      {loadFailed ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert">{t("loadFailed")}</p>
          <Button variant="outline" onClick={() => setRevision((value) => value + 1)}>
            {t("retry")}
          </Button>
        </div>
      ) : null}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : null}
      {!loading && !loadFailed && !projects.length ? (
        <EmptyState title={t("empty")} description={t("description")} />
      ) : null}
      <section
        className="grid gap-4 md:grid-cols-2"
        aria-label={t("projectList")}
        aria-busy={loading}
      >
        {projects.map((project) => (
          <Link
            key={project.id}
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="min-w-0 rounded-lg border p-5 transition-colors hover:bg-muted/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="min-w-0 font-medium [overflow-wrap:anywhere]">{project.title}</h2>
              <StatusBadge
                label={t(
                  project.stage === "draft"
                    ? "draft"
                    : project.stage === "in_progress"
                      ? "inProgress"
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
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {project.description ?? t("noDescription")}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
