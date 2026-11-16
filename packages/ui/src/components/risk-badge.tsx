import type { ComponentProps } from "react"
import { Badge } from "@voidmix/ui/components/badge"
import { cn } from "@voidmix/ui/lib/utils"

const risks = {
  low: { label: "低风险", className: "bg-risk-low text-risk-low-foreground" },
  medium: { label: "中风险", className: "bg-risk-medium text-risk-medium-foreground" },
  high: { label: "高风险", className: "bg-risk-high text-risk-high-foreground" },
}

export type RiskLevel = keyof typeof risks

export function RiskBadge({
  risk,
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, "children" | "variant"> & { risk: RiskLevel }) {
  const state = risks[risk]
  return (
    <Badge variant="secondary" className={cn(state.className, className)} {...props}>
      {state.label}
    </Badge>
  )
}
