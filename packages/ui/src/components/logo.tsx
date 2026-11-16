import { cn } from "cn"

/** Brand mark: a hollow ring on the accent tile. Decorative; pair it with visible text. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
      fill="none"
    >
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <rect width="32" height="32" rx="9" fill="url(#voidmix-logo-sheen)" />
      <circle cx="16" cy="16" r="6.5" className="stroke-primary-foreground" strokeWidth="3" />
      <circle cx="21" cy="11" r="2" className="fill-primary-foreground" />
      <defs>
        <linearGradient id="voidmix-logo-sheen" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="white" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
