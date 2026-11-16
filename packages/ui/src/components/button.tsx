import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-9 pointer-coarse:text-base active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-b from-(--button-top) to-(--button-bottom) text-(--button-text) shadow-[inset_0_1px_0_0_var(--button-edge),0_0_0_1px_var(--button-ring),0_1px_2px_0_rgb(0_0_0/0.18)] hover:from-(--button-top-hover) hover:to-(--button-bottom-hover)",
        outline: "border-input bg-card text-foreground hover:bg-muted aria-expanded:bg-muted",
        // A raised white key on light surfaces; the card shadow supplies its hairline edge.
        secondary:
          "bg-card text-foreground shadow-surface hover:bg-[color-mix(in_oklch,var(--card),var(--foreground)_4%)] aria-expanded:bg-muted",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground",
      },
      size: {
        default:
          "h-7 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-6 gap-1 px-2.5 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-8 gap-1.5 px-3.5",
        icon: "size-7",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-6",
        "icon-lg": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
