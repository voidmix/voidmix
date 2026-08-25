import { lazy } from "react";

let themeMenuPromise: ReturnType<typeof importThemeMenu> | undefined;
let themeMenuItemsPromise: ReturnType<typeof importThemeMenuItems> | undefined;

function importThemeMenu() {
  return import("./theme-menu");
}

function importThemeMenuItems() {
  return import("./theme-menu-items");
}

export function loadThemeMenu() {
  themeMenuPromise ??= importThemeMenu();
  return themeMenuPromise;
}

export function loadThemeMenuItems() {
  themeMenuItemsPromise ??= importThemeMenuItems();
  return themeMenuItemsPromise;
}

export const LazyThemeMenu = lazy(async () => {
  const module = await loadThemeMenu();
  return { default: module.ThemeMenu };
});

export const LazyThemeMenuItems = lazy(async () => {
  const module = await loadThemeMenuItems();
  return { default: module.ThemeMenuItems };
});
