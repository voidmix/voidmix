import { ArrowRight, ArrowUpRight, FileText, ListChecks, ChatCircle } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { CommandInput } from "@voidmix/ui/command-input";
import { EmptyState } from "@voidmix/ui/empty-state";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useState } from "react";
import { ProjectCard } from "../projects/components/project-card";
import { ActivityList } from "../projects/components/activity-list";
import { WorkspaceShell } from "../projects/components/workspace-shell";
import { useWorkspaceData } from "../projects/workspace-data";

export function CleanHome() {
  const t = useTranslations("workspaceUi");
  const navigate = useNavigate();
  const { source, snapshot } = useWorkspaceData();
  const home = source.getHome();
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState("");
  const projectId = home.projects.some((project) => project.id === selected)
    ? selected
    : home.projects[0]?.id;
  function start(prompt: string) {
    if (!projectId) return;
    const session = source.createSession(projectId, prompt);
    void navigate({
      to: "/projects/$projectId/pi/$sessionId",
      params: { projectId, sessionId: session.id },
    });
  }
  return (
    <WorkspaceShell current="home">
      <section className="signal-command" aria-labelledby="signal-home-title">
        <p className="signal-eyebrow">VOIDMIX / {t("home")}</p>
        <h1 id="signal-home-title">{t("title")}</h1>
        <p className="signal-subtitle">{t("subtitle")}</p>
        <CommandInput
          value={draft}
          onChange={setDraft}
          onSubmit={start}
          label={t("ask")}
          placeholder={t("placeholder")}
          submitLabel={t("send")}
          disabled={!projectId}
          context={
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label={t("chooseProject")}
                value={projectId ?? ""}
                onChange={(event) => setSelected(event.target.value)}
                className="signal-context-select"
              >
                {home.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <span className="signal-keyhint">{t("draftHint")}</span>
            </div>
          }
        />
        <div className="signal-templates">
          {(
            [
              { key: "brief", icon: FileText },
              { key: "feedback", icon: ChatCircle },
              { key: "plan", icon: ListChecks },
            ] as const
          ).map(({ key, icon: Icon }) => (
            <Button key={key} variant="ghost" size="sm" onClick={() => setDraft(t(`${key}Prompt`))}>
              <Icon aria-hidden="true" />
              {t(key)}
            </Button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
          {t("previewNote")}
        </p>
      </section>
      <section className="signal-section" aria-labelledby="attention-title">
        <div className="signal-section-heading">
          <h2 id="attention-title">{t("attention")}</h2>
          <span className="text-xs text-muted-foreground">
            {String(home.attention.length).padStart(2, "0")}
          </span>
        </div>
        {home.attention.length ? (
          <ul className="signal-attention">
            {home.attention.map((task) => (
              <li key={task.id}>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: task.projectId }}
                  search={{ tab: "tasks", filter: "all" }}
                >
                  <span className="signal-task-marker" aria-hidden="true">
                    {task.status === "blocked" ? "!" : "○"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {snapshot.projects.find((project) => project.id === task.projectId)?.name} ·{" "}
                      {task.owner}
                    </p>
                  </div>
                  <StatusBadge
                    label={t(task.status)}
                    tone={task.status === "blocked" ? "blocked" : "neutral"}
                  />
                  <ArrowUpRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("nothing")} description={t("nothingDetail")} />
        )}
      </section>
      <section className="signal-section" aria-labelledby="projects-title">
        <div className="signal-section-heading">
          <h2 id="projects-title">{t("progress")}</h2>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground"
          >
            {t("viewAll")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        {home.projects.length ? (
          <div className="signal-project-grid">
            {home.projects.slice(0, 3).map((project) => (
              <ProjectCard project={project} key={project.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("noProjects")}
            description={t("noProjectsDetail")}
            action={<Link to="/projects">{t("createProject")}</Link>}
          />
        )}
      </section>
      <details className="signal-section signal-activity">
        <summary>
          {t("activity")}
          <span className="text-xs text-muted-foreground">{home.activity.length}</span>
        </summary>
        <ActivityList items={home.activity} />
      </details>
    </WorkspaceShell>
  );
}
