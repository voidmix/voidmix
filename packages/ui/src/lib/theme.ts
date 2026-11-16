export type Theme = "dark" | "light"

/** Persisted per browser; absent means the light default. */
export const themeStorageKey = "voidmix-theme"

/**
 * Inline this in `<head>` before the stylesheet paints. It applies the stored theme to `<html>`
 * synchronously, so a returning visitor sees their choice before first paint. Storage access can throw in
 * private or sandboxed contexts; the light default from the server markup then stays in place.
 */
export const themeScript = `(function(){try{var d=localStorage.getItem("${themeStorageKey}")==="dark";document.documentElement.classList.toggle("dark",d)}catch(e){}})()`

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  try {
    localStorage.setItem(themeStorageKey, theme)
  } catch {
    // The choice still applies to this page; it just is not remembered.
  }
}
