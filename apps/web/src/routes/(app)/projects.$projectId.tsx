import { CreateTitleForm } from "../../features/projects/create-title-form";
import { ProjectStatus } from "../../features/projects/project-status";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { SectionHeading } from "@voidmix/ui/section-heading";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useTranslations } from "../../i18n/client";
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
  const { result, tasks } = Route.useLoaderData();
  const router = useRouter();
  async function createTask(title: string) {
    await createRouteApiClient().projects.tasks.create({ projectId, title });
    await router.invalidate({ filter: (match) => match.routeId === Route.id, sync: true });
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
          <CreateTitleForm kind="task" onCreate={createTask} />
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
    </main>
  );
}
