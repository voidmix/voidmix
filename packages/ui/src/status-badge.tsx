import { cn } from "./lib/utils";

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: "neutral" | "active" | "blocked" | "complete";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className={tone === "blocked" ? "text-destructive" : undefined}>
        {tone === "complete" ? "✓" : tone === "blocked" ? "!" : tone === "active" ? "◐" : "○"}
      </span>
      {label}
    </span>
  );
}
