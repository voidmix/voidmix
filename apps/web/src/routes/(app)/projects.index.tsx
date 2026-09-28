import { CreateTitleForm } from "../../features/projects/create-title-form";
import { ProjectStatus } from "../../features/projects/project-status";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { useTranslations } from "../../i18n/client";
import { createRouteApiClient } from "../../lib/route-api";
import {
  RoutePending,
  RouteError,
  PageNavigation,
  pageSearch,
} from "../../features/navigation/route-state";

export const Route = createFileRoute("/(app)/projects/")({
  validateSearch: pageSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, abortController, context }) => ({
    accountId: context.accountId,
    ...(await createRouteApiClient().projects.list(
      { limit: 50, ...deps },
      { signal: abortController.signal },
    )),
  }),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: ProjectsPage,
});

function ProjectsPage() {
  const t = useTranslations("projects");
  const { items: projects, nextCursor } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  async function createProject(title: string) {
    await createRouteApiClient().projects.create({ title });
    await router.invalidate({ filter: (match) => match.routeId === Route.id, sync: true });
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <PageHeader title={t("title")} description={t("description")} />
      <CreateTitleForm kind="project" onCreate={createProject} />
      {!projects.length ? <EmptyState title={t("empty")} description={t("description")} /> : null}
      <PageNavigation
        cursor={search.cursor}
        nextCursor={nextCursor}
        onNavigate={(cursor) => void navigate({ search: cursor ? { cursor } : {} })}
      />
      <section className="grid gap-4 md:grid-cols-2" aria-label={t("projectList")}>
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
