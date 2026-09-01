import { Globe } from "@phosphor-icons/react";
import { useLocale, useSetLocale, useTranslations } from "@voidmix/i18n/client";
import type { Locale } from "@voidmix/i18n/types";
import { Button } from "@voidmix/ui/components/ui/button";
import { lazy, Suspense, useState } from "react";

const LazyLanguageMenu = lazy(async () => {
  const module = await import("./language-menu");
  return { default: module.LanguageMenu };
});

function preloadLanguageMenu() {
  void import("./language-menu");
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const currentLabel = locale === "zh" ? "简体中文" : "English";

  const openMenu = () => {
    setOpen(true);
    setMenuReady(true);
    preloadLanguageMenu();
  };
  const createTrigger = (onClick?: () => void) => (
    <Button
      aria-label={`${t("language")}: ${currentLabel}`}
      aria-expanded={open}
      aria-haspopup="menu"
      disabled={pending}
      onClick={onClick}
      onFocus={preloadLanguageMenu}
      onPointerDown={preloadLanguageMenu}
      size="icon-sm"
      title={`${t("language")}: ${currentLabel}`}
      variant="ghost"
    >
      <Globe aria-hidden="true" />
    </Button>
  );

  const onLocaleChange = (nextLocale: Locale) => {
    setPending(true);
    void setLocale(nextLocale)
      .catch(() => undefined)
      .finally(() => setPending(false));
  };

  if (!menuReady) return createTrigger(openMenu);

  return (
    <Suspense fallback={createTrigger(openMenu)}>
      <LazyLanguageMenu
        locale={locale}
        onLocaleChange={onLocaleChange}
        onOpenChange={setOpen}
        open={open}
        pending={pending}
        trigger={createTrigger()}
      />
    </Suspense>
  );
}
