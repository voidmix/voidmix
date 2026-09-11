export type DesktopTheme = "dark" | "light";

const STORAGE_KEY = "voidmix.desktop.theme";

export function readDesktopTheme(): DesktopTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

export function applyDesktopTheme(theme: DesktopTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}
