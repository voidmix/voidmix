import { MagnifyingGlass } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useTranslations } from "../../../i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { EmptyState } from "@voidmix/ui/empty-state";
import { Input } from "@voidmix/ui/components/ui/input";
import { useEffect, useState } from "react";
import { filterLibraryBriefs, getLibraryBriefs } from "../../library/library-data";
import type { LibrarySearchView, StudioAsset, StudioAssetVersion } from "../types";
import { ProjectStudioShell } from "./studio-shell";
import { AssetGrid } from "./asset-grid";
import { AssetUploadForm } from "./asset-upload-form";
import { useProjectStudioData } from "../studio-data";
import { studioFieldClass, studioInputClass } from "../studio-styles";
import { displayProjectName } from "../preview-copy";

export function LibraryPage() {
  const t = useTranslations("workspaceUi");
  const { source, snapshot } = useProjectStudioData();
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState("");
  const projectId = snapshot.projects.some((project) => project.id === selection)
    ? selection
    : (snapshot.projects[0]?.id ?? "");
  const [remote, setRemote] = useState<LibrarySearchView | null>(null);
  const [loading, setLoading] = useState(Boolean(source.searchLibrary));
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!source.searchLibrary) {
      setRemote(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    const timer = setTimeout(() => {
      void source.searchLibrary!(query).then(
        (result) => {
          if (active) {
            setRemote(result);
            setLoading(false);
          }
        },
        () => {
          if (active) {
            setError(true);
            setLoading(false);
          }
        },
      );
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, source, revision]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const assets = (remote?.assets ?? snapshot.assets ?? []).filter(
    (asset) =>
      asset.status === "active" && asset.path.toLocaleLowerCase().includes(normalizedQuery),
  );
  const briefs = filterLibraryBriefs(
    getLibraryBriefs(remote ? { ...snapshot, projects: remote.projects } : snapshot),
    query,
    (brief) => [
      ...(brief.titleKey ? [t(brief.titleKey)] : []),
      ...(brief.descriptionKey ? [t(brief.descriptionKey)] : []),
      ...(brief.milestoneKey ? [t(brief.milestoneKey)] : []),
    ],
  );

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
            maxLength={200}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
          />
        </div>
      </div>
      {projectId && (source.uploadAsset || source.attachAsset) ? (
        <div className="mb-6 grid gap-4">
          <label className={`${studioFieldClass} max-w-sm`}>
            {t("chooseProject")}
            <select
              className={studioInputClass}
              value={projectId}
              onChange={(event) => setSelection(event.target.value)}
            >
              {snapshot.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {displayProjectName(project, t)}
                </option>
              ))}
            </select>
          </label>
          <AssetUploadForm
            key={projectId}
            projectId={projectId}
            source={source}
            onUploaded={() => setRevision((value) => value + 1)}
          />
        </div>
      ) : null}
      {loading ? (
        <p role="status" className="py-8 text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="flex items-center gap-3 py-8 text-sm">
          <p>{t("libraryLoadError")}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            {t("retry")}
          </Button>
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="grid gap-8">
          {assets.length ? (
            <section aria-label={t("assets")} className="grid gap-4">
              <h2 className="text-lg font-medium">{t("assets")}</h2>
              <AssetGrid
                assets={assets}
                versions={remote?.versions ?? snapshot.versions ?? []}
                references={snapshot.assetReferences ?? []}
                projectId={projectId}
                {...(projectId && source.attachAsset
                  ? {
                      onAttach: async (asset: StudioAsset, version?: StudioAssetVersion) => {
                        await source.attachAsset!(projectId, asset.id, version?.id);
                      },
                    }
                  : {})}
              />
            </section>
          ) : null}
          {briefs.length ? (
            <section aria-label={t("libraryBrief")} className="grid gap-4">
              <h2 className="text-lg font-medium">{t("libraryBrief")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {briefs.map((brief) => (
                  <Link
                    key={brief.id}
                    to="/projects/$projectId"
                    params={{ projectId: brief.projectId }}
                    search={{ tab: "overview", filter: "all" }}
                    className="min-w-0 rounded-xl border border-border p-4 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <h3 className="truncate text-sm font-medium">
                      {brief.titleKey ? t(brief.titleKey) : brief.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {(brief.descriptionKey ? t(brief.descriptionKey) : brief.description) ||
                        t("libraryBrief")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {!assets.length && !briefs.length ? (
            <EmptyState title={t("libraryNoMatches")} description={t("libraryNoMatchesDetail")} />
          ) : null}
        </div>
      ) : null}
    </ProjectStudioShell>
  );
}
