import { Suspense, useState } from "react";

import { Desktop, Moon, Sun } from "@phosphor-icons/react";

import { Button } from "@voidmix/ui/components/ui/button";
import { useTheme, type UserTheme } from "@voidmix/ui/theme";

import { useTranslations } from "@voidmix/i18n/client";
import { LazyThemeMenu, loadThemeMenu } from "./theme-menu-lazy";
import { themeOptions } from "./theme-options";

const themeIcons: Record<UserTheme, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Desktop,
};

export function ThemeSwitcher() {
  const { theme } = useTheme();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const selected = themeOptions.find((option) => option.value === theme) ?? themeOptions.at(-1)!;
  const Icon = themeIcons[selected.value];
  const themeLabel = t(
    `theme${theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}`,
  );
  const prefetchMenu = () => {
    void loadThemeMenu().catch(() => undefined);
  };
  const openMenu = () => {
    setOpen(true);
    void loadThemeMenu()
      .then(() => setMenuReady(true))
      .catch(() => setOpen(false));
  };
  const createTrigger = (onClick?: () => void) => (
    <Button
      aria-label={`${t("theme")}: ${themeLabel}`}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onClick}
      onFocus={prefetchMenu}
      onPointerDown={prefetchMenu}
      size="icon-sm"
      title={`${t("theme")}: ${themeLabel}`}
      variant="ghost"
    >
      <Icon aria-hidden="true" />
    </Button>
  );

  if (menuReady) {
    return (
      <Suspense fallback={createTrigger()}>
        <LazyThemeMenu onOpenChange={setOpen} open={open} trigger={createTrigger()} />
      </Suspense>
    );
  }

  return createTrigger(openMenu);
}
