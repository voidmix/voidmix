import { FileText, ImageSquare, MagnifyingGlass } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Input } from "@voidmix/ui/components/ui/input";
import { WorkspaceShell } from "../features/projects/components/workspace-shell";
import { useWorkspaceData } from "../features/projects/workspace-data";

export const Route = createFileRoute("/library")({ component: LibraryPage });

function LibraryPage() {
  const t = useTranslations("workspaceUi");
  const { snapshot } = useWorkspaceData();
  return (
    <WorkspaceShell current="library" title={t("library")}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Voidmix / Library
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{t("libraryTitle")}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("libraryDescription")}</p>
        </div>
        <div className="relative w-full max-w-xs">
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("librarySearch")}
            aria-label={t("librarySearch")}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {snapshot.projects.flatMap((project, index) => [
          <article
            key={`${project.id}-brief`}
            className="group rounded-xl border bg-card p-5 shadow-[0_8px_30px_rgb(0_0_0/0.04)] transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </span>
              <span className="text-xs text-muted-foreground">BRIEF</span>
            </div>
            <h2 className="mt-5 truncate text-sm font-semibold">{project.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("libraryBrief")}</p>
          </article>,
          ...(index === 0
            ? [
                <article
                  key="visual-reference"
                  className="group rounded-xl border bg-primary p-5 text-primary-foreground shadow-[0_16px_40px_rgb(0_0_0/0.12)] transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-lg bg-primary-foreground/10">
                      <ImageSquare className="size-5" />
                    </span>
                    <span className="text-xs opacity-60">ASSET</span>
                  </div>
                  <h2 className="mt-5 text-sm font-semibold">{t("libraryVisualReference")}</h2>
                  <p className="mt-1 text-xs opacity-65">{t("libraryVisualReferenceDetail")}</p>
                </article>,
              ]
            : []),
        ])}
      </div>
    </WorkspaceShell>
  );
}
