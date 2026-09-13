import { Link } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { useTranslations } from "../../i18n/client";
import { createWebApiClient } from "../../lib/api-client";

const api = createWebApiClient();
type ErrorKey = "loadFailed" | "createFailed";
const LOAD_FAILED: ErrorKey = "loadFailed";
const CREATE_FAILED: ErrorKey = "createFailed";

export function ProjectsPage() {
  const t = useTranslations("projects");
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof api.projects.list>>["items"]>(
    [],
  );
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorKey | null>(null);

  useEffect(() => {
    void api.projects
      .list({})
      .then((result) => {
        setProjects(result.items);
        setLoading(false);
      })
      .catch(() => {
        setError(LOAD_FAILED);
        setLoading(false);
      });
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      const project = await api.projects.create({ title: title.trim() });
      setProjects((current) => [project, ...current]);
      setTitle("");
    } catch {
      setError(CREATE_FAILED);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Voidmix</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <form className="flex gap-2" onSubmit={createProject}>
          <input
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("titlePlaceholder")}
          />
          <button
            className="h-10 rounded-md bg-primary px-4 text-sm text-primary-foreground"
            type="submit"
          >
            {t("newProject")}
          </button>
        </form>
      </header>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {t(error)}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-muted-foreground">{t("loading")}</p> : null}
      {!loading && !projects.length ? (
        <p className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2" aria-label={t("projectList")}>
        {projects.map((project) => (
          <Link
            key={project.id}
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="rounded-lg border p-5 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-medium">{project.title}</h2>
              <span className="text-xs text-muted-foreground">
                {project.stage.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {project.description ?? t("noDescription")}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
