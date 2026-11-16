import type { ComponentProps } from "react"
import { cn } from "@voidmix/ui/lib/utils"

/** A keycap for shortcut hints. Decorative next to a labelled control; the label names the action. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] bg-card px-1 font-mono text-[0.625rem] leading-none font-medium text-muted-foreground shadow-surface",
        className,
      )}
      {...props}
    />
  )
}
