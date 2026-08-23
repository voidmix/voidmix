import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import { useTheme, type UserTheme } from "@voidmix/ui/theme";

const options: ReadonlyArray<{ icon: typeof Sun; label: string; value: UserTheme }> = [
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" },
  { icon: Desktop, label: "System", value: "system" },
];

const labels: Record<UserTheme, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const selected = options.find((option) => option.value === theme) ?? options.at(-1)!;
  const Icon = selected.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Theme: ${labels[theme]}`}
            size="icon-sm"
            title={`Theme: ${labels[theme]}`}
            variant="ghost"
          >
            <Icon aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup
          onValueChange={(value) => setTheme(value as UserTheme)}
          value={theme}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon aria-hidden="true" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
