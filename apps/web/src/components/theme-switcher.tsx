import { Button } from "@voidmix/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import { useTheme } from "@voidmix/ui/theme";

import { ThemeMenuItems, themeLabels, themeOptions } from "./theme-menu-items";

export function ThemeSwitcher() {
  const { theme } = useTheme();
  const selected = themeOptions.find((option) => option.value === theme) ?? themeOptions.at(-1)!;
  const Icon = selected.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Theme: ${themeLabels[theme]}`}
            size="icon-sm"
            title={`Theme: ${themeLabels[theme]}`}
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
