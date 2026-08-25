import type { UserTheme } from "@voidmix/ui/theme";

export const themeOptions: ReadonlyArray<{ label: string; value: UserTheme }> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];
