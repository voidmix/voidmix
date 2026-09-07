import type { ReactNode } from "react";
import { cn } from "./lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-3 rounded-lg border border-dashed border-border px-5 py-12 text-center",
        className,
      )}
    >
      <h2 className="text-base font-medium">{title}</h2>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
