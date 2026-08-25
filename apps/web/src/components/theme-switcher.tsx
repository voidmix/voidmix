import { Button } from "@voidmix/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import { useTheme } from "@voidmix/ui/theme";

import { useOptionalTranslations } from "@voidmix/i18n/client";
import { loadCommonMessages } from "../i18n/common";
import { ThemeMenuItems, themeOptions } from "./theme-menu-items";

export function ThemeSwitcher() {
  const { theme } = useTheme();
  const t = useOptionalTranslations("common", loadCommonMessages, (key) => {
    const fallback: Record<string, string> = {
      theme: "Theme",
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "System",
    };
    return fallback[key] ?? key;
  });
  const selected = themeOptions.find((option) => option.value === theme) ?? themeOptions.at(-1)!;
  const Icon = selected.icon;
  const themeLabel = t(
    `theme${theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}`,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`${t("theme")}: ${themeLabel}`}
            size="icon-sm"
            title={`${t("theme")}: ${themeLabel}`}
            variant="ghost"
          >
            <Icon aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-36">
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
