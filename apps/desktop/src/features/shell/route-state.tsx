import { useRouter } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { useDesktopTranslations } from "../../i18n/client";

export function DesktopRoutePending() {
  const t = useDesktopTranslations("common");
  return (
    <p className="page empty-copy" role="status">
      {t("loading")}
    </p>
  );
}

export function DesktopRouteError() {
  const t = useDesktopTranslations("common");
  const errors = useDesktopTranslations("errors");
  const router = useRouter();
  return (
    <div className="page">
      <p role="alert">{errors("unknown")}</p>
      <Button variant="secondary" onClick={() => void router.invalidate()}>
        {t("retry")}
      </Button>
    </div>
  );
}
