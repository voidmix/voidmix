// Adapted from beUI button-base (MIT). See beui-NOTICE.md.
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "./lib/utils";
import { beuiTransition } from "./lib/beui-motion";

export type BeuiButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type BeuiButtonSize = "sm" | "md" | "icon";
export interface BeuiButtonProps extends HTMLMotionProps<"button"> {
  variant?: BeuiButtonVariant;
  size?: BeuiButtonSize;
}
const variants: Record<BeuiButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-muted text-foreground hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  outline: "border border-input bg-card text-foreground hover:bg-muted",
};
const sizes: Record<BeuiButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  icon: "size-10 shrink-0",
};

export function BeuiButton({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  disabled,
  ...props
}: BeuiButtonProps) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      {...props}
      type={type}
      data-slot="button"
      disabled={disabled}
      whileTap={reduce || disabled ? {} : { scale: 0.98 }}
      transition={reduce ? { duration: 0 } : beuiTransition}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap select-none transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}
