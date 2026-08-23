import {
  CheckCircle,
  ChatCircleDots,
  FolderSimple,
  House,
  Lightning,
  Stack,
} from "@phosphor-icons/react";
import { cn } from "@voidmix/ui/lib/utils";

export const navigation = [
  { label: "Overview", icon: House, current: true },
  { label: "Inbox", icon: ChatCircleDots, current: false, count: 4 },
  { label: "Projects", icon: FolderSimple, current: false },
  { label: "Reviews", icon: CheckCircle, current: false, count: 3 },
  { label: "Decisions", icon: Lightning, current: false },
  { label: "Assets", icon: Stack, current: false },
] as const;

export const recentThreads = [
  "Final cut / v18",
  "Launch film delivery",
  "Q3 campaign brief",
] as const;

export const featuredActivity = {
  title: "Final cut / v18",
  detail: "Review the color pass and close the last delivery decision.",
  meta: "Northstar / Launch film · Updated 8 min ago",
  state: "On track",
  tone: "complete",
  featured: true,
} as const;

export const activity = [
  {
    title: "Approve final color pass",
    detail: "3 reviewers ready · delivery blocked",
    state: "Needs decision",
    tone: "warning",
  },
  {
    title: "Sound mix arriving",
    detail: "Mina is tracking the handoff",
    state: "In progress",
    tone: "live",
  },
  {
    title: "Picture lock confirmed",
    detail: "Leo closed the review thread",
    state: "Complete",
    tone: "complete",
  },
] as const;

export const activityItems = [featuredActivity, ...activity] as const;

export type ActivityTone = (typeof activityItems)[number]["tone"];

export const operators = [
  { name: "Mina Cole", role: "Creative lead" },
  { name: "Leo Wang", role: "Editor" },
  { name: "Samira Bell", role: "Producer" },
] as const;

export function navigationHref(item: { label: string; current: boolean }): string {
  return item.current ? "#overview" : `#${item.label.toLowerCase()}`;
}

export const mobileNavigationItems = navigation.map((item) => ({
  label: item.label,
  icon: item.icon,
  current: item.current,
  href: navigationHref(item),
  ...("count" in item ? { count: item.count } : {}),
}));

export function navigationClassName(item: { current: boolean }): string {
  return cn(
    "flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[0.76rem] text-muted-foreground transition-colors hover:bg-card hover:text-foreground [&_svg]:size-4",
    item.current &&
      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
  );
}

export function activityIndicatorClassName(tone: ActivityTone, featured = false): string {
  return cn(
    "grid size-2 place-items-center rounded-full bg-input",
    tone === "warning" && "bg-destructive",
    tone === "live" && "bg-muted-foreground",
    tone === "complete" && "bg-primary",
    featured && "size-9 rounded-lg bg-input text-primary [&_svg]:size-4",
  );
}

export function activityStateClassName(tone: ActivityTone): string {
  return cn(
    "text-[0.68rem] whitespace-nowrap text-muted-foreground",
    tone === "warning" && "text-destructive",
    tone === "live" && "text-muted-foreground",
    tone === "complete" && "text-primary",
  );
}
