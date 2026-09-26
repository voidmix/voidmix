import { CreateTitleForm } from "../../features/projects/create-title-form";
import { ProjectStatus } from "../../features/projects/project-status";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { SectionHeading } from "@voidmix/ui/section-heading";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useTranslations } from "../../i18n/client";
import { createWebApiClient } from "../../lib/api-client";

export const Route = createFileRoute("/(app)/projects/$projectId")({ component: ProjectRoute });

function ProjectRoute() {
  const params = Route.useParams();
  return <ProjectPage key={params.projectId} {...params} />;
}

const api = createWebApiClient();

function ProjectPage({ projectId }: { projectId: string }) {
  const t = useTranslations("projects");
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.projects.get>> | null>(null);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof api.projects.tasks.list>>["items"]>(
    [],
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setResult(null);
    setTasks([]);
    setLoadFailed(false);
    void Promise.all([api.projects.get({ projectId }), api.projects.tasks.list({ projectId })])
      .then(([projectResponse, taskResponse]) => {
        if (!active) return;
        setResult(projectResponse);
        setTasks(taskResponse.items);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [projectId, revision]);

  async function createTask(title: string) {
    const task = await api.projects.tasks.create({ projectId, title });
    setTasks((current) => [...current, task]);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <Button
        nativeButton={false}
        render={<Link to="/projects" />}
        variant="link"
        className="w-fit"
      >
        ← {t("title")}
      </Button>
      {loadFailed ? (
        <div className="flex items-center gap-3">
          <p role="alert">{t("loadFailed")}</p>
          <Button variant="outline" onClick={() => setRevision((value) => value + 1)}>
            {t("retry")}
          </Button>
        </div>
      ) : !result ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : (
        <>
          <PageHeader
            title={result.project.title}
            description={result.project.description ?? t("noDescription")}
            action={<ProjectStatus stage={result.project.stage} />}
          />
          <section className="flex flex-col gap-4" aria-labelledby="tasks-heading">
            <SectionHeading
              titleId="tasks-heading"
              title={t("tasks")}
              action={<span className="text-sm text-muted-foreground">{tasks.length}</span>}
            />
            <CreateTitleForm key={revision} kind="task" onCreate={createTask} />
            {!tasks.length ? (
              <EmptyState title={t("emptyTasks")} description={t("taskPlaceholder")} />
            ) : (
              <ul className="divide-y rounded-lg border">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{task.title}</span>
                    <StatusBadge
                      label={t(task.status === "in_progress" ? "inProgress" : task.status)}
                      tone={
                        task.status === "done"
                          ? "success"
                          : task.status === "blocked"
                            ? "danger"
                            : task.status === "in_progress"
                              ? "info"
                              : "neutral"
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
