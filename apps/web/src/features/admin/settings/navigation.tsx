import { Link } from "@tanstack/react-router";
import { useTranslations } from "../../../i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";

export function SettingsNavigation({ current }: { current: "auth" | "mail" }) {
  const t = useTranslations("admin");
  return (
    <nav aria-label={t("settingsSections")} className="mb-5 flex flex-wrap gap-2">
      <Button
        nativeButton={false}
        render={<Link to="/admin/settings" />}
        variant={current === "mail" ? "primary" : "outline"}
      >
        {t("mailDelivery")}
      </Button>
      <Button
        nativeButton={false}
        render={<Link to="/admin/settings/auth" />}
        variant={current === "auth" ? "primary" : "outline"}
      >
        {t("authentication")}
      </Button>
    </nav>
  );
}
