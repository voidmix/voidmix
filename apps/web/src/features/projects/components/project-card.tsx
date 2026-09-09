import { ArrowUpRight, FolderSimple } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useFormatter, useTranslations } from "../../../i18n/client";
import { StatusBadge } from "@voidmix/ui/status-badge";
import type { HomeViewModel } from "../types";
import { displayProjectMilestone, displayProjectName } from "../preview-copy";

export function ProjectCard({ project }: { project: HomeViewModel["projects"][number] }) {
  const t = useTranslations("workspaceUi");
  const formatter = useFormatter();
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      search={{ tab: "overview", filter: "all" }}
      className="block min-w-0 rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
    >
      <div className="flex items-center justify-between">
        <FolderSimple aria-hidden="true" className="size-5 text-muted-foreground" />
        <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </div>
      <h3 className="mt-5 truncate text-sm font-semibold">{displayProjectName(project, t)}</h3>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        {displayProjectMilestone(project, t) || t("notSet")}
      </p>
      <div
        className="my-5 h-1 overflow-hidden rounded-full bg-muted"
        aria-label={t("taskCount", { complete: project.complete, total: project.total })}
        role="img"
      >
        <div
          className="h-full bg-foreground/60"
          style={{ width: `${project.total ? (project.complete / project.total) * 100 : 0}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge
          label={
            project.blocked ? t("blockedCount", { count: project.blocked }) : t(project.status)
          }
          tone={project.blocked ? "blocked" : "neutral"}
        />
        <span className="text-xs text-muted-foreground">
          {t("updated", {
            date: formatter.dateTime(project.updatedAt, { month: "short", day: "numeric" }),
          })}
        </span>
      </div>
    </Link>
  );
}
