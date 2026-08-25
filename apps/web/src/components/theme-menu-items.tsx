import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useOptionalTranslations } from "@voidmix/i18n/client";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@voidmix/ui/components/ui/dropdown-menu";
import { useTheme, type UserTheme } from "@voidmix/ui/theme";

import { loadCommonMessages } from "../i18n/common";

export const themeOptions: ReadonlyArray<{ icon: typeof Sun; label: string; value: UserTheme }> = [
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" },
  { icon: Desktop, label: "System", value: "system" },
];

export const themeLabels: Record<UserTheme, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

/**
 * The theme choices as menu items, so a standalone switcher and a larger
 * account menu can offer the same three options without restating them.
 */
export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme();
  const t = useOptionalTranslations("common", loadCommonMessages, (key) => {
    const fallback: Record<string, string> = {
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "System",
    };
    return fallback[key] ?? key;
  });

  return (
    <DropdownMenuRadioGroup onValueChange={(value) => setTheme(value as UserTheme)} value={theme}>
      {themeOptions.map((option) => (
        <DropdownMenuRadioItem key={option.value} value={option.value}>
          <option.icon aria-hidden="true" />
          {t(
            `theme${option.value === "light" ? "Light" : option.value === "dark" ? "Dark" : "System"}`,
          )}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
