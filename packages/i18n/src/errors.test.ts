import { describe, expect, it } from "vite-plus/test";

import { readErrorCode, translateErrorCode, translateKnownErrorCode } from "./errors.js";

const messages = {
  missing: "Missing",
  unknown: "Unknown",
} as const;
const translate = (key: string) => messages[key as keyof typeof messages] ?? key;
const errorKeys = { NOT_FOUND: "missing" } as const;

describe("error-code translation helpers", () => {
  it("reads string error codes without trusting other shapes", () => {
    expect(readErrorCode({ code: "NOT_FOUND" })).toBe("NOT_FOUND");
    expect(readErrorCode({ code: 404 })).toBeUndefined();
    expect(readErrorCode(null)).toBeUndefined();
  });

  it("translates known codes and falls back for unknown errors", () => {
    expect(translateErrorCode({ code: "NOT_FOUND" }, translate, errorKeys)).toBe("Missing");
    expect(translateErrorCode({ code: "OTHER" }, translate, errorKeys)).toBe("Unknown");
    expect(translateKnownErrorCode({ code: "NOT_FOUND" }, translate, errorKeys)).toBe("Missing");
    expect(translateKnownErrorCode({ code: "OTHER" }, translate, errorKeys)).toBeNull();
  });
});
