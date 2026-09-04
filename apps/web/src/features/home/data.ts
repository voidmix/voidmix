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
  { id: "overview", label: "Overview", messageKey: "navOverview", icon: House, current: true },
  {
    id: "inbox",
    label: "Inbox",
    messageKey: "navInbox",
    icon: ChatCircleDots,
    current: false,
    count: 4,
  },
  {
    id: "projects",
    label: "Projects",
    messageKey: "navProjects",
    icon: FolderSimple,
    current: false,
  },
  {
    id: "reviews",
    label: "Reviews",
    messageKey: "navReviews",
    icon: CheckCircle,
    current: false,
    count: 3,
  },
  {
    id: "decisions",
    label: "Decisions",
    messageKey: "navDecisions",
    icon: Lightning,
    current: false,
  },
  { id: "assets", label: "Assets", messageKey: "navAssets", icon: Stack, current: false },
] as const;

export type WorkspaceSectionId = (typeof navigation)[number]["id"];

// The launcher uses the same destinations as the workspace so the sidebar
// stays predictable across the handoff from a new task to an active chat.
export const launcherNavigation = navigation;

export const workspacePlaceholders = [
  {
    id: "inbox",
    descriptionKey: "inboxDescription",
    previewKey: "inboxPreview",
    stateKey: "inboxState",
  },
  {
    id: "projects",
    descriptionKey: "projectsDescription",
    previewKey: "projectsPreview",
    stateKey: "projectsState",
  },
  {
    id: "reviews",
    descriptionKey: "reviewsDescription",
    previewKey: "reviewsPreview",
    stateKey: "reviewsState",
  },
  {
    id: "decisions",
    descriptionKey: "decisionsDescription",
    previewKey: "decisionsPreview",
    stateKey: "decisionsState",
  },
  {
    id: "assets",
    descriptionKey: "assetsDescription",
    previewKey: "assetsPreview",
    stateKey: "assetsState",
  },
] as const satisfies ReadonlyArray<{
  id: Exclude<WorkspaceSectionId, "overview">;
  descriptionKey: string;
  previewKey: string;
  stateKey: string;
}>;

export const recentThreads = [
  "Final cut / v18",
  "Launch film delivery",
  "Q3 campaign brief",
] as const;

export const featuredActivity = {
  title: "Final cut / v18",
  titleKey: "featuredTitle",
  detail: "Review the color pass and close the last delivery decision.",
  detailKey: "featuredDetail",
  meta: "Northstar / Launch film · Updated 8 min ago",
  metaKey: "featuredMeta",
  state: "On track",
  stateKey: "featuredState",
  tone: "complete",
  featured: true,
} as const;

export const activity = [
  {
    title: "Approve final color pass",
    titleKey: "activityColorPassTitle",
    detail: "3 reviewers ready · delivery blocked",
    detailKey: "activityColorPassDetail",
    state: "Needs decision",
    stateKey: "activityColorPassState",
    tone: "warning",
  },
  {
    title: "Sound mix arriving",
    titleKey: "activitySoundMixTitle",
    detail: "Mina is tracking the handoff",
    detailKey: "activitySoundMixDetail",
    state: "In progress",
    stateKey: "activitySoundMixState",
    tone: "live",
  },
  {
    title: "Picture lock confirmed",
    titleKey: "activityPictureLockTitle",
    detail: "Leo closed the review thread",
    detailKey: "activityPictureLockDetail",
    state: "Complete",
    stateKey: "activityPictureLockState",
    tone: "complete",
  },
] as const;

export const activityItems = [featuredActivity, ...activity] as const;

export type ActivityTone = (typeof activityItems)[number]["tone"];

export const operators = [
  { name: "Mina Cole", role: "Creative lead", roleKey: "creativeLead" },
  { name: "Leo Wang", role: "Editor", roleKey: "editor" },
  { name: "Samira Bell", role: "Producer", roleKey: "producer" },
] as const;

export function navigationHref(item: { id?: string; label: string; current: boolean }): string {
  return `#${item.id ?? (item.current ? "overview" : item.label.toLowerCase())}`;
}

export const mobileNavigationItems = navigation.map((item) => ({
  id: item.id,
  label: item.label,
  messageKey: item.messageKey,
  icon: item.icon,
  current: item.current,
  href: navigationHref(item),
  ...("count" in item ? { count: item.count } : {}),
}));

export function navigationClassName(item: { current: boolean; compact?: boolean }): string {
  return cn(
    "flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[0.76rem] text-muted-foreground transition-colors hover:bg-card hover:text-foreground [&_svg]:size-4",
    item.compact &&
      "min-[761px]:mx-auto min-[761px]:w-10 min-[761px]:min-h-10 min-[761px]:justify-center min-[761px]:gap-0 min-[761px]:px-0",
    item.current && "bg-background text-foreground hover:bg-background hover:text-foreground",
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
