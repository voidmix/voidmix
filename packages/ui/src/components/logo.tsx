import { cn } from "cn"

/** Decorative brand mark; pair it with visible text. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
      fill="none"
    >
      <rect width="32" height="32" rx="11" className="fill-primary" />
      <circle cx="16" cy="16" r="6.5" className="stroke-primary-foreground" strokeWidth="3" />
      <circle cx="21" cy="11" r="2" className="fill-primary-foreground" />
    </svg>
  )
}
