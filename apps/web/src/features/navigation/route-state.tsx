import { LoadingState } from "@voidmix/ui/loading-state";
import { translateKnownApiError } from "../../../i18n/api-errors";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { useTranslations } from "../../i18n/client";
export function RoutePending() {
  const t = useTranslations("navigation");
  return <LoadingState label={t("loading")} />;
}
export function RouteError({ error }: ErrorComponentProps) {
  const t = useTranslations("navigation");
  const router = useRouter();
  const errors = useTranslations("errors");
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p role="alert">{translateKnownApiError(error, errors) ?? t("failed")}</p>
      <Button onClick={() => void router.invalidate()}>{t("retry")}</Button>
    </div>
  );
}
export function PageNavigation({
  nextCursor,
  cursor,
  onNavigate,
}: {
  nextCursor: string | null;
  cursor?: string | undefined;
  onNavigate: (cursor?: string) => void;
}) {
  const t = useTranslations("navigation");
  return (
    <nav aria-label={t("pagination")} className="flex justify-end gap-2">
      {cursor ? (
        <Button variant="outline" onClick={() => onNavigate()}>
          {t("first")}
        </Button>
      ) : null}
      {nextCursor ? (
        <Button variant="outline" onClick={() => onNavigate(nextCursor)}>
          {t("next")}
        </Button>
      ) : null}
    </nav>
  );
}
export function pageSearch(input: Record<string, unknown>): { cursor?: string } {
  return typeof input.cursor === "string" && input.cursor ? { cursor: input.cursor } : {};
}
