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
import {
  workspaceContextSelectClass,
  workspaceProjectGridClass,
} from "../projects/workspace-styles";

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
      <section
        className="mx-auto mt-[26px] mb-[54px] max-w-[740px] max-[800px]:mt-[18px] max-[520px]:mb-9"
        aria-labelledby="signal-home-title"
      >
        <p className="text-center text-[10px] text-muted-foreground">VOIDMIX / {t("home")}</p>
        <h1
          id="signal-home-title"
          className="mt-[18px] mb-3 text-center text-[42px] leading-[1.2] font-medium text-balance max-[800px]:text-4xl max-[520px]:text-[28px]"
        >
          {t("title")}
        </h1>
        <p className="mb-[30px] text-center text-sm leading-[1.7] text-muted-foreground">
          {t("subtitle")}
        </p>
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
                className={workspaceContextSelectClass}
              >
                {home.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <span className="max-[1100px]:hidden">{t("draftHint")}</span>
            </div>
          }
        />
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-muted-foreground max-[520px]:gap-0.5 max-[520px]:[&_button]:text-[11px]">
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
      <section className="mt-[34px]" aria-labelledby="attention-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="attention-title" className="text-sm font-medium">
            {t("attention")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {String(home.attention.length).padStart(2, "0")}
          </span>
        </div>
        {home.attention.length ? (
          <ul className="divide-y divide-border border-t border-border">
            {home.attention.map((task) => (
              <li key={task.id}>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: task.projectId }}
                  search={{ tab: "tasks", filter: "all" }}
                  className="flex items-center gap-3.5 rounded-md px-1 py-[15px] transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-[13px] text-muted-foreground"
                    aria-hidden="true"
                  >
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
      <section className="mt-[34px]" aria-labelledby="projects-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="projects-title" className="text-sm font-medium">
            {t("progress")}
          </h2>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground"
          >
            {t("viewAll")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        {home.projects.length ? (
          <div className={workspaceProjectGridClass}>
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
      <details className="mt-[34px] border-t border-border pt-5 [&[open]>summary::after]:content-['−']">
        <summary className="flex cursor-pointer items-center justify-between text-[13px] text-muted-foreground after:ml-3 after:content-['+'] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {t("activity")}
          <span className="text-xs text-muted-foreground">{home.activity.length}</span>
        </summary>
        <ActivityList items={home.activity} />
      </details>
    </WorkspaceShell>
  );
}
