import { CheckCircle, Circle, Info, WarningCircle } from "@phosphor-icons/react";

import { Badge, type BadgeProps } from "./components/ui/badge";
import { cn } from "./lib/utils";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

const toneConfig: Record<
  StatusTone,
  { icon: typeof Circle; variant: NonNullable<BadgeProps["variant"]>; iconClassName?: string }
> = {
  neutral: { icon: Circle, variant: "outline" },
  info: { icon: Info, variant: "secondary", iconClassName: "text-info" },
  warning: { icon: WarningCircle, variant: "secondary", iconClassName: "text-warning" },
  success: { icon: CheckCircle, variant: "secondary", iconClassName: "text-success" },
  danger: { icon: WarningCircle, variant: "destructive" },
};

export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <Badge className={cn("shrink-0", className)} variant={config.variant}>
      <Icon
        aria-hidden="true"
        className={config.iconClassName}
        data-icon="inline-start"
        weight="bold"
      />
      {label}
    </Badge>
  );
}
