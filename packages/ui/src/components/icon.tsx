import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CommandLineIcon,
  ComputerIcon,
  FileEditIcon,
  Globe02Icon,
  InboxIcon,
  Message01Icon,
  Shield01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@voidmix/ui/lib/utils"

const icons = {
  arrowRight: ArrowRight01Icon,
  terminal: CommandLineIcon,
  computer: ComputerIcon,
  file: FileEditIcon,
  globe: Globe02Icon,
  inbox: InboxIcon,
  message: Message01Icon,
  shield: Shield01Icon,
  check: Tick02Icon,
}

export type IconName = keyof typeof icons

/** Decorative shared icons keep the icon dependency inside its UI owner. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      strokeWidth={2}
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
    />
  )
}
