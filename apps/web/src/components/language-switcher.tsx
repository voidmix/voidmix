import { useLocale, useSetLocale, useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { useState } from "react";

import { loadCommonMessages } from "../i18n/common";

export function LanguageSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useTranslations("common", loadCommonMessages);
  const [pending, setPending] = useState(false);
  const nextLocale = locale === "en" ? "zh" : "en";

  return (
    <Button
      aria-label={`${t("language")}: ${locale === "en" ? t("english") : t("chinese")}`}
      disabled={pending}
      onClick={() => {
        setPending(true);
        void setLocale(nextLocale)
          .catch(() => undefined)
          .finally(() => setPending(false));
      }}
      size="sm"
      variant="ghost"
    >
      {nextLocale === "zh" ? "中文" : "EN"}
    </Button>
  );
}
