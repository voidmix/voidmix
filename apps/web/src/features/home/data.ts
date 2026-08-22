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

export type ActivityTone = (typeof activity)[number]["tone"];

export const operators = [
  { name: "Mina Cole", role: "Creative lead" },
  { name: "Leo Wang", role: "Editor" },
  { name: "Samira Bell", role: "Producer" },
] as const;

export function navigationHref(item: { label: string; current: boolean }): string {
  return item.current ? "#overview" : `#${item.label.toLowerCase()}`;
}

export function navigationClassName(item: { current: boolean }): string {
  return cn("workspace-nav__item", item.current && "is-current");
}

export function activityIndicatorClassName(tone: ActivityTone): string {
  return `activity-row__indicator activity-row__indicator--${tone}`;
}

export function activityStateClassName(tone: ActivityTone): string {
  return `activity-row__state activity-row__state--${tone}`;
}
