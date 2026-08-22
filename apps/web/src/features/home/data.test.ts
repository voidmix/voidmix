import { describe, expect, it } from "vite-plus/test";

import {
  activityIndicatorClassName,
  activityStateClassName,
  navigationClassName,
  navigationHref,
} from "./data";

describe("home view model", () => {
  it("resolves the overview navigation target and active class", () => {
    const item = { label: "Overview", current: true } as const;

    expect(navigationHref(item)).toBe("#overview");
    expect(navigationClassName(item)).toBe("workspace-nav__item is-current");
  });

  it("creates stable targets for inactive navigation items", () => {
    const item = { label: "Inbox", current: false } as const;

    expect(navigationHref(item)).toBe("#inbox");
    expect(navigationClassName(item)).toBe("workspace-nav__item");
  });

  it("keeps activity tone classes aligned with the CSS contract", () => {
    expect(activityIndicatorClassName("warning")).toBe(
      "activity-row__indicator activity-row__indicator--warning",
    );
    expect(activityStateClassName("complete")).toBe(
      "activity-row__state activity-row__state--complete",
    );
  });
});
