import { FolderSimple, Plus } from "@phosphor-icons/react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { IconButton } from "@voidmix/ui/icon-button";
import { CaretLineLeft, CaretRight } from "@phosphor-icons/react";
import { Field, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { Modal } from "@voidmix/ui/modal";
import { EmptyState } from "@voidmix/ui/empty-state";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { PageHeader } from "@voidmix/ui/page-header";
import { useDesktopTranslations, useFormatter } from "../../i18n/client";
import { loadProjects, createProject } from "../../lib/projects";
import { ProjectUnavailable } from "../../features/shell/project-unavailable";

export const Route = createFileRoute("/projects/")({
  ssr: false,
  validateSearch: (input: Record<string, unknown>): { cursor?: string } =>
    typeof input.cursor === "string" && input.cursor ? { cursor: input.cursor } : {},
  loaderDeps: ({ search }) => search,
  loader: ({ abortController, deps }) => loadProjects(abortController.signal, deps),
  component: ProjectsPage,
});

function ProjectsPage() {
  const t = useDesktopTranslations("projects");
  const formatter = useFormatter();
  const errors = useDesktopTranslations("errors");
  const router = useRouter();
  const result = Route.useLoaderData();
  const projects = result.data?.items ?? [];
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const navigation = useDesktopTranslations("navigation");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submitProject() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await createProject(title);
      await router.invalidate({ filter: (match) => match.routeId === "/projects/", sync: true });
      setTitle("");
      setCreating(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page projects-page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Modal
            title={t("newProject")}
            closeLabel={t("close")}
            busy={saving}
            open={creating}
            onOpenChange={setCreating}
            trigger={
              <Button disabled={result.status === "unavailable"}>
                <Plus data-icon="inline-start" />
                {t("newProject")}
              </Button>
            }
          >
            <form
              className="flex flex-col gap-4"
              aria-busy={saving}
              onSubmit={(event) => {
                event.preventDefault();
                void submitProject();
              }}
            >
              <Field data-disabled={saving}>
                <FieldLabel htmlFor="desktop-project-title">{t("name")}</FieldLabel>
                <Input
                  id="desktop-project-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={500}
                  autoFocus
                  disabled={saving}
                />
              </Field>
              <Button type="submit" disabled={!title.trim() || saving}>
                {t(saving ? "saving" : "newProject")}
              </Button>
              {failed ? <p role="alert">{errors("unknown")}</p> : null}
            </form>
          </Modal>
        }
      />
      {result.status === "unavailable" ? (
        <ProjectUnavailable result={result} routeId={Route.id} />
      ) : !projects.length ? (
        <EmptyState
          title={t("empty")}
          description={t(search.cursor ? "emptyPage" : "emptyDescription")}
        />
      ) : null}
      <section className="project-list" aria-label={t("projectList")}>
        {projects.length ? (
          <div className="project-columns" aria-hidden="true">
            <span>{t("name")}</span>
            <span>{t("stage")}</span>
            <span>{t("ownership")}</span>
            <span>{t("updated")}</span>
          </div>
        ) : null}
        {projects.map((project) => (
          <Link
            className="project-row"
            key={project.id}
            to="/projects/$projectId"
            params={{ projectId: project.id }}
          >
            <div className="project-identity">
              <FolderSimple aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="truncate" title={project.title}>
                  {project.title}
                </h2>
                <p className="line-clamp-1">{project.description ?? t("noDescription")}</p>
              </div>
            </div>
            <StatusBadge
              label={t(project.stage)}
              tone={
                project.stage === "delivered"
                  ? "success"
                  : project.stage === "draft"
                    ? "neutral"
                    : "info"
              }
            />
            <span className="text-xs text-muted-foreground">
              {t(project.organizationId ? "organization" : "personal")}
            </span>
            <time
              className="project-updated text-xs text-muted-foreground"
              dateTime={project.updatedAt.toISOString()}
            >
              {formatter.dateTime(project.updatedAt, "short")}
            </time>
          </Link>
        ))}
      </section>
      <nav aria-label={navigation("pagination")} className="mb-4 flex justify-end gap-2">
        {search.cursor ? (
          <IconButton
            label={navigation("first")}
            variant="outline"
            onClick={() => void navigate({ search: {} })}
          >
            <CaretLineLeft aria-hidden="true" />
          </IconButton>
        ) : null}
        {result.data?.nextCursor ? (
          <IconButton
            label={navigation("next")}
            variant="outline"
            onClick={() => void navigate({ search: { cursor: result.data!.nextCursor! } })}
          >
            <CaretRight aria-hidden="true" />
          </IconButton>
        ) : null}
      </nav>
    </div>
  );
}
