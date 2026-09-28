import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { CreateTitleForm } from "../../features/projects/create-title-form";
import { ProjectStatus } from "../../features/projects/project-status";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { SectionHeading } from "@voidmix/ui/section-heading";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useFormatter, useTranslations } from "../../i18n/client";
import { createRouteApiClient } from "../../lib/route-api";
import { RoutePending, RouteError } from "../../features/navigation/route-state";

export const Route = createFileRoute("/(app)/projects/$projectId")({
  loader: async ({ params, abortController, context }) => {
    const api = createRouteApiClient();
    const options = { signal: abortController.signal };
    const [result, taskPage] = await Promise.all([
      api.projects.get({ projectId: params.projectId }, options),
      api.projects.tasks.list({ projectId: params.projectId }, options),
    ]);
    return { accountId: context.accountId, result, tasks: taskPage.items };
  },
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const { projectId } = Route.useParams();
  return <ProjectDetail key={projectId} projectId={projectId} />;
}

function ProjectDetail({ projectId }: { projectId: string }) {
  const t = useTranslations("projects");
  const formatter = useFormatter();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { result, tasks } = Route.useLoaderData();
  const router = useRouter();
  async function createTask(title: string) {
    setSaving(true);
    try {
      await createRouteApiClient().projects.tasks.create({ projectId, title });
      await router.invalidate({ filter: (match) => match.routeId === Route.id, sync: true });
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  const { project, access } = result;
  const writable = access === "write" || access === "manage";
  return (
    <div className="project-page">
      <nav
        aria-label={t("breadcrumb")}
        className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground"
      >
        <Link to="/projects">{t("title")}</Link>
        <span aria-hidden="true">/</span>
        <span className="truncate">{project.title}</span>
      </nav>
      <PageHeader
        title={project.title}
        description={project.description ?? t("noDescription")}
        action={<ProjectStatus stage={project.stage} />}
      />
      <div className="project-detail-grid">
        <section className="flex min-w-0 flex-col gap-5" aria-labelledby="tasks-heading">
          <SectionHeading
            titleId="tasks-heading"
            title={t("tasksCount", { count: tasks.length })}
            action={
              writable ? (
                <Button
                  variant="outline"
                  disabled={saving}
                  aria-expanded={creating}
                  onClick={() => setCreating(!creating)}
                >
                  <Plus data-icon="inline-start" />
                  {t(creating ? "close" : "addTask")}
                </Button>
              ) : undefined
            }
          />
          {creating && writable ? <CreateTitleForm kind="task" onCreate={createTask} /> : null}
          {!writable ? <p className="text-sm text-muted-foreground">{t("readOnly")}</p> : null}
          {!tasks.length ? (
            <EmptyState
              title={t("emptyTasks")}
              description={t(writable ? "taskPlaceholder" : "readOnly")}
            />
          ) : (
            <ul className="project-task-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{task.title}</span>
                  <StatusBadge
                    label={t(task.status === "in_progress" ? "inProgress" : task.status)}
                    tone={
                      task.status === "done"
                        ? "success"
                        : task.status === "blocked"
                          ? "warning"
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
        <dl className="project-facts" aria-label={t("projectInfo")}>
          <div>
            <dt>{t("ownership")}</dt>
            <dd>{t(project.organizationId ? "organization" : "personal")}</dd>
          </div>
          <div>
            <dt>{t("deadline")}</dt>
            <dd>
              {project.deadline ? formatter.dateTime(project.deadline, "short") : t("noDeadline")}
            </dd>
          </div>
          <div>
            <dt>{t("updated")}</dt>
            <dd>{formatter.dateTime(project.updatedAt, "short")}</dd>
          </div>
          <div>
            <dt>{t("created")}</dt>
            <dd>{formatter.dateTime(project.createdAt, "short")}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
