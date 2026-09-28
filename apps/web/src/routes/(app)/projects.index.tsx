import { useState } from "react";
import { FolderSimple, Plus } from "@phosphor-icons/react";
import { BeuiButton } from "@voidmix/ui/beui-button";
import { Modal } from "@voidmix/ui/modal";
import { CreateTitleForm } from "../../features/projects/create-title-form";
import { ProjectStatus } from "../../features/projects/project-status";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { useFormatter, useTranslations } from "../../i18n/client";
import { createRouteApiClient } from "../../lib/route-api";
import { RouteError, PageNavigation, pageSearch } from "../../features/navigation/route-state";

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
  pendingComponent: ProjectsPending,
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
    <div className="beui-project-page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Modal
            title={t("newProject")}
            description={t("createDescription")}
            closeLabel={t("close")}
            busy={saving}
            surfaceClassName="beui-theme"
            open={creating}
            onOpenChange={setCreating}
            trigger={
              <BeuiButton>
                <Plus data-icon="inline-start" />
                {t("newProject")}
              </BeuiButton>
            }
          >
            <CreateTitleForm
              kind="project"
              renderSubmit={(props) => <BeuiButton {...props} />}
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
        <div className="beui-project-empty">
          <FolderSimple aria-hidden="true" />
          <EmptyState
            title={t("empty")}
            description={search.cursor ? t("emptyPage") : t("emptyDescription")}
          />
        </div>
      ) : (
        <section className="beui-project-list" aria-label={t("projectList")}>
          <div className="beui-project-columns" aria-hidden="true">
            <span>{t("projectName")}</span>
            <span>{t("stage")}</span>
            <span>{t("ownership")}</span>
            <span>{t("updated")}</span>
          </div>
          {projects.map((project) => (
            <Link
              className="beui-project-row"
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
            >
              <div className="beui-project-identity">
                <span className="beui-project-icon">
                  <FolderSimple aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 title={project.title}>{project.title}</h2>
                  <p className="line-clamp-1">{project.description ?? t("noDescription")}</p>
                </div>
              </div>
              <ProjectStatus stage={project.stage} appearance="beui" />
              <span className="beui-project-owner text-xs text-muted-foreground">
                {t(project.organizationId ? "organization" : "personal")}
              </span>
              <time
                className="beui-project-updated text-xs text-muted-foreground"
                dateTime={project.updatedAt.toISOString()}
              >
                {formatter.dateTime(project.updatedAt, "short")}
              </time>
            </Link>
          ))}
        </section>
      )}
      <PageNavigation
        appearance="beui"
        cursor={search.cursor}
        nextCursor={nextCursor}
        onNavigate={(cursor) => void navigate({ search: cursor ? { cursor } : {} })}
      />
    </div>
  );
}

function ProjectsPending() {
  const t = useTranslations("projects");
  const navigation = useTranslations("navigation");
  return (
    <div className="beui-project-page" aria-busy="true">
      <PageHeader title={t("title")} description={t("description")} />
      <div role="status" aria-label={navigation("loading")} className="beui-project-skeleton">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
