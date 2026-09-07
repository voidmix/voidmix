import { ArrowUp } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";

export function CommandInput({
  value,
  onChange,
  onSubmit,
  label,
  placeholder,
  submitLabel,
  context,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  label: string;
  placeholder: string;
  submitLabel: string;
  context?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <form
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && value.trim()) onSubmit(value.trim());
      }}
    >
      <textarea
        aria-label={label}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        maxLength={8000}
        className="w-full resize-y bg-transparent text-base leading-7 outline-none disabled:opacity-60"
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            (event.metaKey || event.ctrlKey) &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-muted-foreground">{context}</div>
        <Button
          type="submit"
          aria-label={submitLabel}
          size="icon"
          variant="primary"
          disabled={disabled || !value.trim()}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
