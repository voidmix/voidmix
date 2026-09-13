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
        tone === "active" && "bg-info/10",
        tone === "blocked" && "bg-destructive/10",
        tone === "complete" && "bg-success/10",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          tone === "active" && "text-info",
          tone === "blocked" && "text-destructive",
          tone === "complete" && "text-success",
        )}
      >
        {tone === "complete" ? "✓" : tone === "blocked" ? "!" : tone === "active" ? "◐" : "○"}
      </span>
      {label}
    </span>
  );
}
