import { describe, expect, it } from "vite-plus/test";

import { assertMessageCatalogParity, extractIcuArguments } from "./testing.js";

describe("message catalog testing helpers", () => {
  it("extracts ICU arguments from plural messages", () => {
    expect(
      extractIcuArguments("{count, plural, one {{name} has # item} other {{name} has # items}}"),
    ).toEqual(["count", "name"]);
  });

  it("reports missing keys, type changes, and ICU argument drift with paths", () => {
    expect(() =>
      assertMessageCatalogParity(
        { home: { greeting: "Hi {name}", nested: { value: "x" } } },
        { home: { greeting: "你好", nested: "x" } },
        "en",
        "zh",
      ),
    ).toThrow(/home.greeting|home.nested/);
  });

  it("accepts equivalent catalog structure and arguments", () => {
    expect(() =>
      assertMessageCatalogParity(
        { home: { greeting: "Hi {name}", count: "{count, plural, one {# item} other {# items}}" } },
        { home: { greeting: "你好，{name}", count: "{count, plural, one {# 项} other {# 项}}" } },
        "en",
        "zh",
      ),
    ).not.toThrow();
  });
});
