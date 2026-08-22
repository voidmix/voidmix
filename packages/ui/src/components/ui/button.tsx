import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "vm-button group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:translate-y-px",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:translate-y-px",
        outline:
          "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
        danger:
          "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 rounded-md gap-1 px-2 text-xs [&>svg]:size-3.5",
        sm: "h-9 rounded-md gap-1.5 px-3 text-xs",
        small: "h-9 rounded-md px-3 text-xs",
        medium: "h-10 px-4",
        lg: "h-11 rounded-md px-6",
        large: "h-11 rounded-md px-6",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&>svg]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ComponentProps<typeof BaseButton>, VariantProps<typeof buttonVariants> {
  type?: "button" | "submit" | "reset";
}

function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <BaseButton
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      type={type}
      {...props}
    />
  );
}

export { Button, buttonVariants };
