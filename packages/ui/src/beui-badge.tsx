// Adapted from beUI animated-badge (MIT). See beui-NOTICE.md.
import { Check, Circle, Info, Warning, X, type Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "./lib/utils";
import { beuiTransition } from "./lib/beui-motion";

export type BeuiBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";
export interface BeuiBadgeProps extends HTMLMotionProps<"span"> {
  tone?: BeuiBadgeTone;
  contentKey?: string;
}
const tones: Record<BeuiBadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-secondary text-secondary-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};
const icons: Record<BeuiBadgeTone, Icon> = {
  neutral: Circle,
  info: Info,
  success: Check,
  warning: Warning,
  danger: X,
};

export function BeuiBadge({
  tone = "neutral",
  contentKey,
  children,
  className,
  ...props
}: BeuiBadgeProps) {
  const reduce = useReducedMotion();
  const Icon = icons[tone];
  return (
    <motion.span
      {...props}
      layout={reduce ? false : "size"}
      transition={reduce ? { duration: 0 } : beuiTransition}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={contentKey ?? tone}
          initial={reduce ? false : { opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? {} : { opacity: 0, y: -3 }}
          transition={reduce ? { duration: 0 } : beuiTransition}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
