import { useFormatter, useTranslations } from "../../../i18n/client";
import type { Formatter } from "@voidmix/i18n";
import { Button } from "@voidmix/ui/components/ui/button";
import { EmptyState } from "@voidmix/ui/empty-state";
import { useState } from "react";
import { translateWebError } from "../../../i18n/error-message";
import type { StudioAsset, StudioAssetReference, StudioAssetVersion } from "../types";

type AttachAsset = (asset: StudioAsset, version?: StudioAssetVersion) => Promise<void>;

function formatBytes(bytes: number, formatter: Formatter) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatter.number(Number((bytes / 1024).toFixed(1)))} KB`;
  return `${formatter.number(Number((bytes / (1024 * 1024)).toFixed(1)))} MB`;
}

function AssetCard({
  asset,
  versions,
  reference,
  onAttach,
}: {
  asset: StudioAsset;
  versions: StudioAssetVersion[];
  reference?: StudioAssetReference;
  onAttach?: AttachAsset;
}) {
  const t = useTranslations("workspaceUi");
  const errorT = useTranslations("errors");
  const formatter = useFormatter();
  const currentVersion = versions.find(
    (version) => version.id === (reference?.versionId ?? asset.headVersionId),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attach() {
    if (!onAttach || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onAttach(asset, currentVersion);
    } catch (reason) {
      setError(translateWebError(reason, errorT, "uploadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-all text-sm font-medium">{asset.path}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("versionCount", { count: versions.length })}
            {currentVersion ? ` · ${formatBytes(currentVersion.byteSize, formatter)}` : ""}
          </p>
        </div>
        {reference ? (
          <span className="text-xs text-muted-foreground">{t("assetReference")}</span>
        ) : null}
      </div>
      {currentVersion ? (
        <div className="flex flex-wrap justify-between gap-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <span>{currentVersion.contentType ?? t("notSet")}</span>
          <time dateTime={currentVersion.createdAt.toISOString()}>
            {formatter.dateTime(currentVersion.createdAt, "short")}
          </time>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("notSet")}</p>
      )}
      {versions.length ? (
        <details className="text-xs">
          <summary className="cursor-pointer py-1 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">
            {t("versionHistory")}
          </summary>
          <ol className="mt-2 grid gap-2" aria-label={t("versionHistory")}>
            {versions.map((version, index) => (
              <li
                key={version.id}
                className="flex flex-wrap justify-between gap-2 border-t border-border pt-2"
              >
                <span title={version.id}>
                  {version.id === asset.headVersionId
                    ? t("latestVersion")
                    : `${t("version")} ${versions.length - index}`}
                </span>
                <time dateTime={version.createdAt.toISOString()}>
                  {formatter.dateTime(version.createdAt, "short")}
                </time>
                <span className="text-muted-foreground">
                  {formatBytes(version.byteSize, formatter)}
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {onAttach && !reference ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={attach}
          disabled={busy || !currentVersion}
        >
          {busy ? t("loading") : `${t("create")} · ${t("assetReference")}`}
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </article>
  );
}

export function AssetGrid({
  assets,
  versions,
  references = [],
  projectId,
  onAttach,
}: {
  assets: StudioAsset[];
  versions: StudioAssetVersion[];
  references?: StudioAssetReference[];
  projectId?: string;
  onAttach?: AttachAsset;
}) {
  const t = useTranslations("workspaceUi");
  const projectReferences = references.filter((reference) => reference.projectId === projectId);
  if (!assets.length) return <EmptyState title={t("noAssets")} description={t("noAssetsDetail")} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => {
        const reference = projectReferences.find((item) => item.assetId === asset.id);
        return (
          <AssetCard
            key={`${projectId ?? "library"}:${asset.id}`}
            asset={asset}
            versions={versions
              .filter((version) => version.assetId === asset.id)
              .sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
              )}
            {...(reference ? { reference } : {})}
            {...(onAttach ? { onAttach } : {})}
          />
        );
      })}
    </div>
  );
}
