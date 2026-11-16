import type { ReactNode } from "react"
import { cn } from "cn"

import { Logo } from "@voidmix/ui/components/logo"
import { ThemeToggle } from "@voidmix/ui/components/theme-toggle"

/**
 * Full-page frame shared by Web and desktop: backdrop, a thin top bar, and a centered column.
 * `brandHref` shows the wordmark as a link; omit it on pages whose own heading is the brand.
 */
export function AppShell({ children, brandHref }: { children: ReactNode; brandHref?: string }) {
  return (
    <div className="app-backdrop flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        {brandHref ? (
          <a
            href={brandHref}
            className="-mx-2 inline-flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-[0.95rem] font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Logo className="size-6" />
            Voidmix
          </a>
        ) : (
          <span />
        )}
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pt-4 pb-20 sm:px-6">
        {children}
      </main>
    </div>
  )
}

/** Raised panel for the page's primary content. */
export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("surface w-full p-6 sm:p-8", className)}>{children}</div>
}
