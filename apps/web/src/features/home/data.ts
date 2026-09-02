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

export const launcherNavigation = navigation.filter(
  (item) => item.id === "overview" || item.id === "projects",
);

export const launcherPrompts = [
  { id: "summary", messageKey: "launcherSummary", icon: ChatCircleDots },
  { id: "blockers", messageKey: "launcherBlockers", icon: Lightning },
  { id: "review", messageKey: "launcherReview", icon: CheckCircle },
  { id: "nextSteps", messageKey: "launcherNextSteps", icon: Stack },
] as const;

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
