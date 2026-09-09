import { Plus } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslations } from "../../i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@voidmix/ui/components/ui/dialog";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { useState } from "react";
import { ProjectStudioShell } from "./components/studio-shell";
import { ProjectCard } from "./components/project-card";
import { useProjectStudioData } from "./studio-data";
import { studioFieldClass, studioInputClass, studioProjectGridClass } from "./studio-styles";
import {
  displayProjectDescription,
  displayProjectMilestone,
  displayProjectName,
} from "./preview-copy";

export function ProjectsPage() {
  const t = useTranslations("workspaceUi");
  const navigate = useNavigate();
  const { source, snapshot } = useProjectStudioData();
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const projects = snapshot.projects.filter(
    (project) =>
      (archived || project.status !== "archived") &&
      [
        project.name,
        project.description,
        project.milestone,
        displayProjectName(project, t),
        displayProjectDescription(project, t),
        displayProjectMilestone(project, t),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
  );
  return (
    <ProjectStudioShell title={t("projects")}>
      <PageHeader
        title={t("projects")}
        description={t("projectDescription")}
        action={
          <Button onClick={() => setCreating(true)} variant="primary">
            <Plus aria-hidden="true" />
            {t("createProject")}
          </Button>
        }
      />
      <div className="my-[30px] flex items-center gap-4 max-[520px]:flex-col max-[520px]:items-start">
        <input
          className={`${studioInputClass} max-w-80`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t("searchProjects")}
          placeholder={t("searchProjects")}
        />
        <label className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => setArchived(event.target.checked)}
          />
          {t("archiveFilter")}
        </label>
      </div>
      {projects.length ? (
        <div className={studioProjectGridClass}>
          {projects.map((project) => {
            const tasks = snapshot.tasks.filter((task) => task.projectId === project.id);
            return (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  total: tasks.length,
                  complete: tasks.filter((task) => task.status === "done").length,
                  blocked: tasks.filter((task) => task.status === "blocked").length,
                }}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={t(query ? "noMatches" : "noProjects")}
          description={t(query ? "noMatchesDetail" : "noProjectsDetail")}
          action={
            !query ? (
              <Button onClick={() => setCreating(true)}>{t("createProject")}</Button>
            ) : undefined
          }
        />
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>{t("createProject")}</DialogTitle>
          <DialogDescription>{t("sessionOnly")}</DialogDescription>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              const project = source.createProject(name);
              setCreating(false);
              setName("");
              void navigate({
                to: "/projects/$projectId",
                params: { projectId: project.id },
                search: { tab: "overview", filter: "all" },
              });
            }}
          >
            <label className={studioFieldClass}>
              {t("name")}
              <input
                className={studioInputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
                autoFocus
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setCreating(false)} variant="ghost">
                {t("cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={!name.trim()}>
                {t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ProjectStudioShell>
  );
}
