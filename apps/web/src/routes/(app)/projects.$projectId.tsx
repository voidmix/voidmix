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
    <div className="project-page flex flex-col gap-6 [&_h1]:text-[26px] [&_h1]:leading-[1.25] [&_h1]:tracking-[-0.025em] [@media(max-width:767px)]:[&_h1]:text-[24px]">
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
      <div className="project-detail-grid grid grid-cols-[minmax(0,_1fr)_288px] items-start gap-8 [@media(max-width:1023px)]:grid-cols-1">
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
          {!writable && tasks.length > 0 ? (
            <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
          ) : null}
          {!tasks.length ? (
            <EmptyState
              title={t("emptyTasks")}
              description={t(writable ? "taskPlaceholder" : "readOnly")}
            />
          ) : (
            <ul className="project-task-list border-y border-border [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-4 [&_li]:py-4.5 [&_li]:px-0 [&_li]:border-b [&_li]:border-border [&_li:last-child]:border-b-0">
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
        <dl
          className="project-facts flex flex-col gap-5 border-l border-border pl-6 [&_dt]:text-muted-foreground [&_dt]:text-[12px] [&_dt]:mb-1 [&_dd]:wrap-anywhere [@media(max-width:1023px)]:order-[-1] [@media(max-width:1023px)]:grid [@media(max-width:1023px)]:grid-cols-2 [@media(max-width:1023px)]:border-l-0 [@media(max-width:1023px)]:border-b [@media(max-width:1023px)]:border-border [@media(max-width:1023px)]:pt-0 [@media(max-width:1023px)]:pb-5 [@media(max-width:1023px)]:px-0"
          aria-label={t("projectInfo")}
        >
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
