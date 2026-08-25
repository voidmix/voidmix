import { describe, expect, it } from "vite-plus/test";

import { translateApiError } from "./api-errors";

const translate = (key: string) => key;

describe("desktop API error translations", () => {
  it("translates the supported Desktop error-code subset", () => {
    expect(translateApiError({ code: "USER_NOT_FOUND" }, translate)).toBe("userNotFound");
    expect(translateApiError({ code: "MAIL_NOT_CONFIGURED" }, translate)).toBe("mailNotConfigured");
  });

  it("uses the generic fallback for codes owned only by Web", () => {
    expect(translateApiError({ code: "REGISTRATION_DISABLED" }, translate)).toBe("unknown");
  });
});
