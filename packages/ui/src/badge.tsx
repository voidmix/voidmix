import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted/60 text-muted-foreground",
        positive: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
        warning: "border-amber-300/25 bg-amber-300/10 text-amber-200",
        accent: "border-primary/30 bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: VariantProps<typeof badgeVariants>["tone"];
  withDot?: boolean;
}

export function Badge({
  tone = "neutral",
  withDot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        badgeVariants({ tone }),
        "vm-badge",
        tone ? `vm-badge--${tone}` : undefined,
        className,
      )}
      {...props}
    >
      {withDot ? <span aria-hidden="true" className="vm-badge__dot" /> : null}
      {children}
    </span>
  );
}
