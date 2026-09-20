import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
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
  const [taskTitle, setTaskTitle] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [taskFailed, setTaskFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [revision, setRevision] = useState(0);
  const activeProject = useRef(projectId);
  activeProject.current = projectId;

  useEffect(() => {
    let active = true;
    setResult(null);
    setTasks([]);
    setTaskTitle("");
    setTaskFailed(false);
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

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim() || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setTaskFailed(false);
    try {
      const task = await api.projects.tasks.create({ projectId, title: taskTitle.trim() });
      if (activeProject.current !== projectId) return;
      setTasks((current) => [...current, task]);
      setTaskTitle("");
    } catch {
      if (activeProject.current === projectId) setTaskFailed(true);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
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
            action={
              <StatusBadge
                label={t(
                  result.project.stage === "draft"
                    ? "draft"
                    : result.project.stage === "in_progress"
                      ? "inProgress"
                      : result.project.stage === "review"
                        ? "review"
                        : "delivered",
                )}
                tone={
                  result.project.stage === "delivered"
                    ? "success"
                    : result.project.stage === "draft"
                      ? "neutral"
                      : "info"
                }
              />
            }
          />
          <section className="flex flex-col gap-4" aria-labelledby="tasks-heading">
            <SectionHeading
              titleId="tasks-heading"
              title={t("tasks")}
              action={<span className="text-sm text-muted-foreground">{tasks.length}</span>}
            />
            <form onSubmit={createTask} aria-busy={saving}>
              <FieldGroup>
                <Field data-disabled={saving}>
                  <FieldLabel htmlFor="task-title">{t("taskPlaceholder")}</FieldLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="task-title"
                      className="min-w-0 flex-1 basis-48"
                      value={taskTitle}
                      required
                      disabled={saving}
                      aria-describedby={taskFailed ? "task-create-error" : undefined}
                      onChange={(event) => setTaskTitle(event.target.value)}
                      placeholder={t("taskPlaceholder")}
                    />
                    <Button type="submit" disabled={saving || !taskTitle.trim()}>
                      {saving ? t("saving") : t("addTask")}
                    </Button>
                  </div>
                  {taskFailed ? (
                    <FieldError id="task-create-error">{t("taskFailed")}</FieldError>
                  ) : null}
                </Field>
              </FieldGroup>
            </form>
            {!tasks.length ? (
              <EmptyState title={t("emptyTasks")} description={t("taskPlaceholder")} />
            ) : (
              <ul className="divide-y rounded-lg border">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{task.title}</span>
                    <StatusBadge
                      label={t(
                        task.status === "todo"
                          ? "todo"
                          : task.status === "in_progress"
                            ? "inProgress"
                            : task.status === "blocked"
                              ? "blocked"
                              : "done",
                      )}
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
