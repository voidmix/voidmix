import { FileArrowUp, FileText, ImageSquare, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useDesktopTranslations, useFormatter } from "../../i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { loadLibrary, type PreviewAsset, type StudioLibrary } from "../../lib/project-studio";
import { formatBytes } from "../../lib/cloud";

export function LibraryPage() {
  const t = useDesktopTranslations("library");
  const projectT = useDesktopTranslations("projects");
  const formatter = useFormatter();
  const [result, setResult] = useState<{
    status: "loading" | "preview" | "loaded" | "unavailable";
    data: StudioLibrary | readonly PreviewAsset[] | null;
  }>({ status: "loading", data: null });
  const [query, setQuery] = useState("");
  useEffect(() => {
    void loadLibrary().then(setResult);
  }, []);
  const previewAssets = isPreviewAssets(result.data) ? result.data : null;
  const loadedLibrary = result.data && !isPreviewAssets(result.data) ? result.data : null;
  const assets = previewAssets
    ? previewAssets.filter((asset) =>
        `${asset.name} ${projectT(asset.projectTitleKey)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : (loadedLibrary?.assets.filter(
        (asset) =>
          asset.status === "active" && asset.path.toLowerCase().includes(query.toLowerCase()),
      ) ?? []);
  return (
    <div className="page library-page">
      <PageHeader
        className="page-header"
        title={t("title")}
        description={t("description")}
        action={
          <Button className="primary-button" variant="primary">
            <FileArrowUp size={15} />
            {t("addAsset")}
          </Button>
        }
      />
      <label className="library-search">
        <MagnifyingGlass size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
        />
      </label>
      <div className={`data-source ${result.status === "loaded" ? "cloud" : "demo"}`} role="status">
        {result.status === "loading"
          ? t("loading")
          : result.status === "preview"
            ? t("previewData")
            : result.status === "loaded"
              ? t("cloudData")
              : t("unavailable")}
      </div>
      {result.status === "unavailable" ? (
        <p className="empty-copy">{t("unavailableDescription")}</p>
      ) : (
        <section className="library-list" aria-label={t("assetList")}>
          {assets.map((asset) => {
            const preview = isPreviewAsset(asset);
            const name = preview ? asset.name : asset.path;
            const currentVersion =
              !preview && loadedLibrary
                ? loadedLibrary.versions.find((version) => version.id === asset.headVersionId)
                : undefined;
            const detail = preview
              ? t("previewFileDetail", {
                  project: projectT(asset.projectTitleKey),
                  size: formatBytes(asset.sizeBytes, formatter),
                })
              : currentVersion
                ? t("fileDetail", {
                    assetId: asset.id,
                    size: formatBytes(currentVersion.byteSize, formatter),
                  })
                : t("fileDetailUnavailable", { assetId: asset.id });
            const type = preview ? asset.type : "file";
            return (
              <article className="library-row" key={asset.id}>
                <span className="library-icon">
                  {type === "video" ? <ImageSquare size={18} /> : <FileText size={18} />}
                </span>
                <div>
                  <strong>{name}</strong>
                  <span>{detail}</span>
                </div>
                <span className="library-kind">
                  {type === "brief" || type === "audio" || type === "video" ? t(type) : t("asset")}
                </span>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function isPreviewAssets(
  value: StudioLibrary | readonly PreviewAsset[] | null,
): value is readonly PreviewAsset[] {
  return Array.isArray(value);
}

function isPreviewAsset(
  value: StudioLibrary["assets"][number] | PreviewAsset,
): value is PreviewAsset {
  return "name" in value;
}
