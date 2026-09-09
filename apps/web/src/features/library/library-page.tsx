import { FileText, MagnifyingGlass } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useTranslations } from "../../i18n/client";
import { EmptyState } from "@voidmix/ui/empty-state";
import { Input } from "@voidmix/ui/components/ui/input";
import { useState } from "react";
import { filterLibraryBriefs, getLibraryBriefs } from "./library-data";
import { ProjectStudioShell } from "../projects/components/studio-shell";
import { useProjectStudioData } from "../projects/studio-data";

export function LibraryPage() {
  const t = useTranslations("workspaceUi");
  const { snapshot } = useProjectStudioData();
  const [query, setQuery] = useState("");
  const briefs = filterLibraryBriefs(getLibraryBriefs(snapshot), query, (brief) => [
    ...(brief.titleKey ? [t(brief.titleKey)] : []),
    ...(brief.descriptionKey ? [t(brief.descriptionKey)] : []),
    ...(brief.milestoneKey ? [t(brief.milestoneKey)] : []),
  ]);

  return (
    <ProjectStudioShell current="library" title={t("library")}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">{t("libraryTitle")}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("libraryDescription")}</p>
        </div>
        <div className="relative w-full max-w-xs">
          <MagnifyingGlass
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9"
            placeholder={t("librarySearch")}
            aria-label={t("librarySearch")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
          />
        </div>
      </div>
      {briefs.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {briefs.map((brief) => (
            <Link
              key={brief.id}
              to="/projects/$projectId"
              params={{ projectId: brief.projectId }}
              search={{ tab: "overview", filter: "all" }}
              className="group rounded-xl border bg-card p-5 shadow-[0_8px_30px_rgb(0_0_0/0.04)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-muted">
                  <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
                </span>
                <span className="text-xs text-muted-foreground">{t("libraryBriefType")}</span>
              </div>
              <h2 className="mt-5 truncate text-sm font-semibold">
                {brief.titleKey ? t(brief.titleKey) : brief.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {(brief.descriptionKey ? t(brief.descriptionKey) : brief.description) ||
                  t("libraryBrief")}
              </p>
              {(brief.milestoneKey ? t(brief.milestoneKey) : brief.milestone) ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  {brief.milestoneKey ? t(brief.milestoneKey) : brief.milestone}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title={t("libraryNoMatches")} description={t("libraryNoMatchesDetail")} />
      )}
    </ProjectStudioShell>
  );
}
