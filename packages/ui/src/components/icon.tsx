import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Clock01Icon,
  Coins01Icon,
  CommandLineIcon,
  ComputerIcon,
  Copy01Icon,
  CpuIcon,
  FileEditIcon,
  Globe02Icon,
  InboxIcon,
  LaptopIcon,
  Message01Icon,
  Notification01Icon,
  Search01Icon,
  ServerStack01Icon,
  Shield01Icon,
  Tick02Icon,
  Timer01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@voidmix/ui/lib/utils"

const icons = {
  arrowRight: ArrowRight01Icon,
  bell: Notification01Icon,
  clock: Clock01Icon,
  close: Cancel01Icon,
  coins: Coins01Icon,
  copy: Copy01Icon,
  cpu: CpuIcon,
  laptop: LaptopIcon,
  search: Search01Icon,
  server: ServerStack01Icon,
  timer: Timer01Icon,
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
