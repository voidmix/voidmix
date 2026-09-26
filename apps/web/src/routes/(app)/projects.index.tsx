import { CreateTitleForm } from "../../features/projects/create-title-form";
import { ProjectStatus } from "../../features/projects/project-status";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { useTranslations } from "../../i18n/client";
import { createWebApiClient } from "../../lib/api-client";

export const Route = createFileRoute("/(app)/projects/")({ component: ProjectsPage });

const api = createWebApiClient();

function ProjectsPage() {
  const t = useTranslations("projects");
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof api.projects.list>>["items"]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
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

  async function createProject(title: string) {
    const project = await api.projects.create({ title });
    setProjects((current) => [project, ...current]);
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <PageHeader title={t("title")} description={t("description")} />
      <CreateTitleForm kind="project" onCreate={createProject} />
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
              <ProjectStatus stage={project.stage} />
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
