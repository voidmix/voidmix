import { ArrowUpRight, FolderSimple } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useLocale, useTranslations } from "@voidmix/i18n/client";
import { StatusBadge } from "@voidmix/ui/status-badge";
import type { HomeViewModel } from "../types";

export function ProjectCard({ project }: { project: HomeViewModel["projects"][number] }) {
  const t = useTranslations("workspaceUi");
  const locale = useLocale();
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      search={{ tab: "overview", filter: "all" }}
      className="signal-project-card"
    >
      <div className="flex items-center justify-between">
        <FolderSimple aria-hidden="true" className="size-5 text-muted-foreground" />
        <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </div>
      <h3 className="mt-5 truncate text-sm font-semibold">{project.name}</h3>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        {project.milestone || t("notSet")}
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
            date: project.updatedAt.toLocaleDateString(locale, { month: "short", day: "numeric" }),
          })}
        </span>
      </div>
    </Link>
  );
}
