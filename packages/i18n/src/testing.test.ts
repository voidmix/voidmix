import { describe, expect, it } from "vite-plus/test";

import { assertMessageCatalogParity, extractIcuArguments } from "./testing.js";

describe("message catalog testing helpers", () => {
  it("extracts ICU arguments from plural messages", () => {
    expect(
      extractIcuArguments("{count, plural, one {{name} has # item} other {{name} has # items}}"),
    ).toEqual(["count", "name"]);
  });

  it("ignores select and plural branch labels", () => {
    expect(
      extractIcuArguments(
        "{status, select, active {Active} suspended {Suspended} other {Unknown}} {count, plural, one {# file} other {# files}}",
      ),
    ).toEqual(["count", "status"]);
  });

  it("keeps arguments after ordinary apostrophes visible", () => {
    expect(extractIcuArguments("Today's {date}")).toEqual(["date"]);
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

  it("accepts translated select branches with the same argument", () => {
    expect(() =>
      assertMessageCatalogParity(
        { status: "{status, select, active {Active} other {Unknown}}" },
        { status: "{status, select, active {启用} other {未知}}" },
        "en",
        "zh",
      ),
    ).not.toThrow();
  });
});
