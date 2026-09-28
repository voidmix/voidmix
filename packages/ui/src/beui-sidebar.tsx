// Adapted from beUI animated-sidebar (MIT). See beui-NOTICE.md.
import type { ComponentProps } from "react";
import { cn } from "./lib/utils";

// Responsive width is owned by the application; CSS keeps SSR and hydration identical.
// Mobile overlays deliberately use the existing Base UI Modal, not a second focus trap.
export function BeuiSidebar({ className, ...props }: ComponentProps<"aside">) {
  return (
    <aside
      {...props}
      data-slot="beui-sidebar"
      className={cn(
        "sticky top-0 flex h-svh flex-col gap-8 border-r border-border bg-card",
        className,
      )}
    />
  );
}
