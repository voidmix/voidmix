import { Link } from "@tanstack/react-router";
import { useTranslations } from "../../../i18n/client";
import { useProjectStudioData } from "../studio-data";
import { AssetGrid } from "./asset-grid";
import { AssetUploadForm } from "./asset-upload-form";

export function ProjectCanvas({ projectId }: { projectId: string }) {
  const t = useTranslations("workspaceUi");
  const { source, snapshot } = useProjectStudioData();
  const items = source.getProjectAssets(projectId);
  return (
    <section className="grid gap-6" aria-label={t("canvas")}>
      <AssetUploadForm projectId={projectId} source={source} />
      <AssetGrid
        assets={items.map((item) => item.asset)}
        versions={snapshot.versions ?? []}
        references={items.map((item) => item.reference)}
        projectId={projectId}
      />
      <Link to="/library" className="w-fit text-sm underline underline-offset-4">
        {t("library")}
      </Link>
    </section>
  );
}
