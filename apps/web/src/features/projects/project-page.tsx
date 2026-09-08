import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useState } from "react";
import { ProjectStudioShell } from "./components/studio-shell";
import { TaskList } from "./components/task-list";
import { ProjectSettings } from "./components/project-settings";
import { ActivityList } from "./components/activity-list";
import { ProjectCanvas } from "./components/project-canvas";
import { useProjectStudioData } from "./studio-data";
import { taskStatusSchema, type ProjectTab, type TaskFilter } from "./types";
import {
  studioContextSelectClass,
  studioFieldClass,
  studioInputClass,
  studioLabelClass,
  studioSearchRowClass,
} from "./studio-styles";

export function ProjectPage({
  projectId,
  tab,
  filter,
}: {
  projectId: string;
  tab: ProjectTab;
  filter: TaskFilter;
}) {
  const t = useTranslations("workspaceUi");
  const { source, snapshot } = useProjectStudioData();
  const navigate = useNavigate();
  const [undo, setUndo] = useState<(() => void) | null>(null);
  const project = snapshot.projects.find((item) => item.id === projectId);
  if (!project)
    return (
      <ProjectStudioShell>
        <EmptyState
          title={t("missing")}
          description={t("missingDetail")}
          action={<Link to="/projects">{t("back")}</Link>}
        />
      </ProjectStudioShell>
    );
  const tasks = snapshot.tasks.filter((task) => task.projectId === projectId);
  const sessions = snapshot.sessions.filter((session) => session.projectId === projectId);
  function startSession() {
    const session = source.createSession(projectId, "");
    void navigate({
      to: "/projects/$projectId/pi/$sessionId",
      params: { projectId, sessionId: session.id },
    });
  }
  return (
    <ProjectStudioShell title={project.name} projectSearch={{ tab, filter }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/projects" className="text-xs text-muted-foreground">
          ← {t("back")}
        </Link>
        <select
          aria-label={t("chooseProject")}
          className={`${studioContextSelectClass} max-w-full`}
          value={projectId}
          onChange={(event) => {
            setUndo(null);
            void navigate({
              to: "/projects/$projectId",
              params: { projectId: event.target.value },
              search: { tab, filter },
            });
          }}
        >
          {snapshot.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <PageHeader
        title={project.name}
        description={project.description || t("projectDescription")}
        action={<StatusBadge label={t(project.status)} tone="active" />}
      />
      <nav
        className="my-[30px] flex gap-6 overflow-x-auto border-b border-border max-[520px]:gap-5"
        aria-label={t("projects")}
      >
        {(
          ["overview", "brief", "canvas", "tasks", "feedback", "activity", "settings"] as const
        ).map((item) => (
          <Link
            key={item}
            to="/projects/$projectId"
            params={{ projectId }}
            search={{ tab: item, filter }}
            aria-current={tab === item ? "page" : undefined}
            className="flex shrink-0 items-center gap-2 border-b-2 border-transparent py-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none aria-[current=page]:border-foreground aria-[current=page]:text-foreground [&_span]:text-[11px]"
          >
            {t(item)}
            {item === "tasks" ? <span>{tasks.length}</span> : null}
          </Link>
        ))}
      </nav>
      {undo ? (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2 text-[13px]"
        >
          <span>{t("saved")}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              undo();
              setUndo(null);
            }}
          >
            {t("undo")}
          </Button>
        </div>
      ) : null}
      {tab === "overview" ? (
        <div className="grid gap-8">
          <div className="grid grid-cols-[1.5fr_1fr] gap-9 max-[520px]:grid-cols-1">
            <section>
              <h2 className={studioLabelClass}>{t("goal")}</h2>
              <p className="mt-3 text-sm leading-7">{project.description || t("notSet")}</p>
            </section>
            <section>
              <h2 className={studioLabelClass}>{t("milestone")}</h2>
              <p className="mt-3 text-sm">{project.milestone || t("notSet")}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {t("taskCount", {
                  complete: tasks.filter((task) => task.status === "done").length,
                  total: tasks.length,
                })}
              </p>
            </section>
          </div>
          <section>
            <h2 className="mb-4 text-sm font-medium">{t("attention")}</h2>
            {tasks.some((task) => task.status === "blocked") ? (
              tasks
                .filter((task) => task.status === "blocked")
                .map((task) => (
                  <Link
                    key={task.id}
                    className={studioSearchRowClass}
                    to="/projects/$projectId"
                    params={{ projectId }}
                    search={{ tab: "tasks", filter: "blocked" }}
                  >
                    <StatusBadge label={t("blocked")} tone="blocked" />
                    {task.title}
                  </Link>
                ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("nothing")}</p>
            )}
          </section>
          <Button className="w-fit" onClick={startSession}>
            {t("newSession")}
          </Button>
        </div>
      ) : null}
      {tab === "tasks" ? (
        <>
          <label className={`${studioFieldClass} mb-5 w-fit`}>
            {t("status")}
            <select
              className={`${studioInputClass} w-auto`}
              value={filter}
              onChange={(event) => {
                void navigate({
                  to: "/projects/$projectId",
                  params: { projectId },
                  search: { tab, filter: event.target.value as TaskFilter },
                });
              }}
            >
              {["all", ...taskStatusSchema.options].map((item) => (
                <option key={item} value={item}>
                  {t(item)}
                </option>
              ))}
            </select>
          </label>
          <TaskList
            tasks={tasks.filter((task) => filter === "all" || task.status === filter)}
            onAdd={(title) => {
              const task = source.createTask(projectId, title);
              setUndo(() => () => source.removeTask(task.id));
            }}
            onUpdate={(task) => {
              const previous = tasks.find((item) => item.id === task.id);
              source.updateTask(task);
              if (previous) setUndo(() => () => source.updateTask(previous));
            }}
          />
        </>
      ) : null}
      {tab === "canvas" ? <ProjectCanvas projectId={projectId} /> : null}
      {tab === "brief" || tab === "feedback" ? (
        <section className="grid gap-4">
          <PageHeader title={t(tab)} description={project.description || t("notSet")} />
          <EmptyState title={t("comingSoon")} description={t("sectionPreviewDetail")} />
        </section>
      ) : null}
      {tab === "pi" ? (
        <section>
          <div className="mb-5">
            <Button onClick={startSession} variant="primary">
              {t("newSession")}
            </Button>
          </div>
          {sessions.length ? (
            <ul className="divide-y divide-border">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link
                    to="/projects/$projectId/pi/$sessionId"
                    params={{ projectId, sessionId: session.id }}
                    className={studioSearchRowClass}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {session.prompt || t("session")}
                    </span>
                    <StatusBadge label={t(session.status)} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("noSessions")} description={t("noSessionsDetail")} />
          )}
        </section>
      ) : null}
      {tab === "activity" ? (
        <ActivityList items={snapshot.activity.filter((item) => item.projectId === projectId)} />
      ) : null}
      {tab === "settings" ? (
        <ProjectSettings
          key={`${project.id}-${project.updatedAt.getTime()}`}
          project={project}
          onSave={(updated) => {
            source.updateProject(updated);
            setUndo(() => () => source.updateProject(project));
          }}
        />
      ) : null}
    </ProjectStudioShell>
  );
}
