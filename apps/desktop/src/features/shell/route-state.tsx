import { Alert, AlertDescription } from "@voidmix/ui/components/ui/alert";
import { LoadingState } from "@voidmix/ui/loading-state";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { useDesktopTranslations } from "../../i18n/client";

export function RefreshButton({ routeId }: { routeId: string }) {
  const t = useDesktopTranslations("overview");
  const router = useRouter();
  const loading = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === routeId && Boolean(match.isFetching)),
  });
  return (
    <Button
      variant="outline"
      disabled={loading}
      aria-busy={loading}
      onClick={() => void router.invalidate({ filter: (match) => match.routeId === routeId })}
    >
      <ArrowsClockwise data-icon="inline-start" />
      {t(loading ? "refreshing" : "refresh")}
    </Button>
  );
}

export function DesktopRoutePending() {
  const t = useDesktopTranslations("common");
  return (
    <div className="page">
      <LoadingState label={t("loading")} />
    </div>
  );
}

export function DesktopRouteError() {
  const t = useDesktopTranslations("common");
  const errors = useDesktopTranslations("errors");
  const router = useRouter();
  return (
    <div className="page">
      <Alert variant="destructive">
        <AlertDescription>{errors("unknown")}</AlertDescription>
      </Alert>
      <Button variant="secondary" onClick={() => void router.invalidate()}>
        {t("retry")}
      </Button>
    </div>
  );
}
