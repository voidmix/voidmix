import { FileArrowUp, FileText, ImageSquare, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { loadLibrary, type PreviewAsset, type StudioLibrary } from "../../lib/project-studio";

export function LibraryPage() {
  const t = useTranslations("library");
  const [result, setResult] = useState<{
    status: "loading" | "preview" | "loaded" | "unavailable";
    data: StudioLibrary | readonly PreviewAsset[] | null;
  }>({ status: "loading", data: null });
  const [query, setQuery] = useState("");
  useEffect(() => {
    void loadLibrary().then(setResult);
  }, []);
  const assets = Array.isArray(result.data)
    ? result.data.filter((asset) =>
        `${asset.name} ${asset.detail}`.toLowerCase().includes(query.toLowerCase()),
      )
    : result.data && "assets" in result.data
      ? result.data.assets
      : [];
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
          ? "Loading library…"
          : result.status === "preview"
            ? "Preview data"
            : result.status === "loaded"
              ? "Cloud data"
              : "Library data unavailable"}
      </div>
      {result.status === "unavailable" ? (
        <p className="empty-copy">
          Library data is unavailable. Check the API connection and try again.
        </p>
      ) : (
        <section className="library-list" aria-label={t("assetList")}>
          {assets.map((asset) => {
            const preview = "name" in asset;
            const name = preview ? asset.name : asset.id;
            const detail = preview ? asset.detail : `${asset.assetId} · ${asset.byteSize} bytes`;
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
                  {type === "brief" || type === "audio" || type === "video" ? t(type) : "Asset"}
                </span>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
