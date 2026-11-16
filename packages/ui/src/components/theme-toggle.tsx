import { useSyncExternalStore } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"

import { Button } from "@voidmix/ui/components/button"
import { applyTheme, currentTheme, type Theme } from "@voidmix/ui/lib/theme"

/** The `<html>` class is the source of truth, so every toggle on the page stays in sync. */
function subscribe(notify: () => void) {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

export function ThemeToggle() {
  // The server renders the dark default; a stored light choice is picked up at hydration.
  const theme = useSyncExternalStore<Theme>(subscribe, currentTheme, () => "dark")
  const next: Theme = theme === "light" ? "dark" : "light"

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={next === "light" ? "切换到浅色模式" : "切换到深色模式"}
      onClick={() => applyTheme(next)}
    >
      <HugeiconsIcon icon={next === "light" ? Sun03Icon : Moon02Icon} strokeWidth={2} />
    </Button>
  )
}
