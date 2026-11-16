import type { ComponentProps } from "react"
import { Badge } from "@voidmix/ui/components/badge"
import { cn } from "@voidmix/ui/lib/utils"

const states = {
  running: { label: "运行中", className: "bg-status-running text-status-running-foreground" },
  waiting: { label: "等待审批", className: "bg-status-waiting text-status-waiting-foreground" },
  done: { label: "已完成", className: "bg-status-done text-status-done-foreground" },
  failed: { label: "已失败", className: "bg-status-failed text-status-failed-foreground" },
}

export type AgentStatus = keyof typeof states

export function StatusPill({
  status,
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, "children" | "variant"> & { status: AgentStatus }) {
  const state = states[status]
  return (
    <Badge variant="secondary" className={cn(state.className, className)} {...props}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {state.label}
    </Badge>
  )
}
