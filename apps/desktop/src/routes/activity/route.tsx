import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@voidmix/ui/page-header";
import { EmptyState } from "@voidmix/ui/empty-state";
import { useDesktopTranslations } from "../../i18n/client";

export const Route = createFileRoute("/activity")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter:
      search.filter === "uploads" || search.filter === "downloads" || search.filter === "backups"
        ? search.filter
        : ("all" as const),
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const t = useDesktopTranslations("activity");
  return (
    <div className="page">
      <PageHeader title={t("title")} />
      <EmptyState title={t("unavailable")} description={t("unavailableDescription")} />
    </div>
  );
}
