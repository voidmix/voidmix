import { describe, expect, it } from "vite-plus/test";

import { getAuthErrorMessage } from "./feedback";

describe("auth feedback", () => {
  it("uses an authentication error message when one is available", () => {
    expect(getAuthErrorMessage({ message: "Invalid email or password" }, "Fallback")).toBe(
      "Invalid email or password",
    );
    expect(getAuthErrorMessage(new Error("Request failed"), "Fallback")).toBe("Request failed");
  });

  it("uses the safe fallback for unknown or empty errors", () => {
    expect(getAuthErrorMessage({ message: "" }, "Unable to sign in.")).toBe("Unable to sign in.");
    expect(getAuthErrorMessage(null, "Unable to sign in.")).toBe("Unable to sign in.");
  });

  it("does not expose browser transport errors as user-facing copy", () => {
    expect(getAuthErrorMessage(new TypeError("Failed to fetch"), "Unable to sign in.")).toBe(
      "Unable to sign in.",
    );
  });
});
