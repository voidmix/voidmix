import { describe, expect, it } from "vite-plus/test";

import {
  activityItems,
  activityIndicatorClassName,
  activityStateClassName,
  mobileNavigationItems,
  navigation,
  navigationClassName,
  navigationHref,
} from "./data";

describe("home view model", () => {
  it("resolves the overview navigation target and active class", () => {
    const item = { label: "Overview", current: true } as const;

    expect(navigationHref(item)).toBe("#overview");
    expect(navigationClassName(item)).toContain("bg-primary");
    expect(navigationClassName(item)).toContain("text-primary-foreground");
  });

  it("creates stable targets for inactive navigation items", () => {
    const item = { label: "Inbox", current: false } as const;

    expect(navigationHref(item)).toBe("#inbox");
    expect(navigationClassName(item)).toContain("text-muted-foreground");
    expect(navigationClassName(item)).not.toContain("bg-primary");
  });

  it("keeps every workspace entry attached to a matching page section", () => {
    expect(navigation.map(navigationHref)).toEqual([
      "#overview",
      "#inbox",
      "#projects",
      "#reviews",
      "#decisions",
      "#assets",
    ]);
  });

  it("keeps activity tone classes aligned with the CSS contract", () => {
    expect(activityIndicatorClassName("warning")).toContain("bg-destructive");
    expect(activityStateClassName("complete")).toContain("text-primary");
  });

  it("keeps the featured thread first in the activity scan order", () => {
    expect(activityItems[0]).toMatchObject({
      featured: true,
      title: "Final cut / v18",
      state: "On track",
    });
  });

  it("derives mobile navigation from the desktop workspace navigation", () => {
    expect(mobileNavigationItems).toHaveLength(navigation.length);
    expect(
      mobileNavigationItems.map(({ label, href, ...item }) => ({
        label,
        href,
        ...("count" in item ? { count: item.count } : {}),
      })),
    ).toEqual([
      { label: "Overview", href: "#overview" },
      { label: "Inbox", href: "#inbox", count: 4 },
      { label: "Projects", href: "#projects" },
      { label: "Reviews", href: "#reviews", count: 3 },
      { label: "Decisions", href: "#decisions" },
      { label: "Assets", href: "#assets" },
    ]);
  });
});
