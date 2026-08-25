import { describe, expect, it } from "vite-plus/test";

import { messages } from "./messages";

describe("web i18n catalogs", () => {
  it.each([
    ["common", "language"],
    ["home", "askVoidmix"],
    ["auth", "signIn"],
    ["errors", "unknown"],
  ] as const)("loads the %s namespace synchronously", (namespace, key) => {
    expect(messages.en[namespace]).toBeDefined();
    expect(messages.zh[namespace]).toBeDefined();
    expect(key in (messages.en[namespace] as Record<string, unknown>)).toBe(true);
    expect(key in (messages.zh[namespace] as Record<string, unknown>)).toBe(true);
  });

  it("keeps identical root namespace keys for both locales", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.zh).sort());
  });
});
