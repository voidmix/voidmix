import { describe, expect, it } from "vite-plus/test";

import { Route } from "./__root";

describe("web root route", () => {
  it("defines the root route and public metadata", async () => {
    const head = await Route.options.head?.({} as never);

    expect(Route.isRoot).toBe(true);
    expect(head?.meta).toEqual(
      expect.arrayContaining([
        { title: "Voidmix | Creative work, one live signal" },
        {
          name: "description",
          content:
            "Voidmix keeps briefs, feedback, decisions, people, and delivery visible in one live creative workspace.",
        },
      ]),
    );
  });
});
