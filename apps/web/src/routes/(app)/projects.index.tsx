import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { Modal } from "@voidmix/ui/modal";
import { CreateTitleForm } from "../../features/projects/create-title-form";
import { ProjectStatus } from "../../features/projects/project-status";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { useFormatter, useTranslations } from "../../i18n/client";
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
  const formatter = useFormatter();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { items: projects, nextCursor } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  async function createProject(title: string) {
    await createRouteApiClient().projects.create({ title });
    await router.invalidate({ filter: (match) => match.routeId === Route.id, sync: true });
  }

  return (
    <div className="project-page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Modal
            title={t("newProject")}
            description={t("createDescription")}
            closeLabel={t("close")}
            busy={saving}
            open={creating}
            onOpenChange={setCreating}
            trigger={
              <Button>
                <Plus data-icon="inline-start" />
                {t("newProject")}
              </Button>
            }
          >
            <CreateTitleForm
              kind="project"
              onCreate={async (title) => {
                setSaving(true);
                try {
                  await createProject(title);
                  setCreating(false);
                } finally {
                  setSaving(false);
                }
              }}
            />
          </Modal>
        }
      />
      {!projects.length ? (
        <EmptyState
          title={t("empty")}
          description={search.cursor ? t("emptyPage") : t("emptyDescription")}
        />
      ) : (
        <section className="project-list" aria-label={t("projectList")}>
          {projects.map((project) => (
            <Link key={project.id} to="/projects/$projectId" params={{ projectId: project.id }}>
              <div className="min-w-0">
                <h2 className="truncate">{project.title}</h2>
                <p className="line-clamp-1">{project.description ?? t("noDescription")}</p>
              </div>
              <ProjectStatus stage={project.stage} />
              <span className="text-xs text-muted-foreground">
                {t(project.organizationId ? "organization" : "personal")}
              </span>
              <time
                className="text-xs text-muted-foreground"
                dateTime={project.updatedAt.toISOString()}
              >
                {formatter.dateTime(project.updatedAt, "short")}
              </time>
            </Link>
          ))}
        </section>
      )}
      <PageNavigation
        cursor={search.cursor}
        nextCursor={nextCursor}
        onNavigate={(cursor) => void navigate({ search: cursor ? { cursor } : {} })}
      />
    </div>
  );
}
