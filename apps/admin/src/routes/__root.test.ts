import { describe, expect, it } from "vite-plus/test";

import { Route } from "./__root";

describe("admin root route", () => {
  it("defines the root route and control metadata", async () => {
    const head = await Route.options.head?.({} as never);

    expect(Route.isRoot).toBe(true);
    expect(head?.meta).toEqual(
      expect.arrayContaining([
        { title: "Voidmix Control" },
        {
          name: "description",
          content: "User operations and audit control for Voidmix.",
        },
      ]),
    );
  });
});
