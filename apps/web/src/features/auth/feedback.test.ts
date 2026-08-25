import { describe, expect, it } from "vite-plus/test";

import { getAuthErrorMessage } from "./feedback";

/**
 * Stands in for the `errors` namespace: returns the key so an assertion can tell
 * which message key was chosen without restating the catalog here.
 */
const translateError = (key: string) => `errors.${key}`;

describe("auth feedback", () => {
  it("states the reason from the code the API sends", () => {
    // The API sends a code and no prose, so the code is the only path to a
    // specific, translated reason.
    expect(getAuthErrorMessage({ code: "REGISTRATION_DISABLED" }, "Fallback", translateError)).toBe(
      "errors.registrationDisabled",
    );
    expect(
      getAuthErrorMessage({ code: "EMAIL_DOMAIN_NOT_ALLOWED" }, "Fallback", translateError),
    ).toBe("errors.emailDomainNotAllowed");
  });

  it("prefers a known code over prose that shipped alongside it", () => {
    expect(
      getAuthErrorMessage(
        { code: "PASSWORD_RESET_DISABLED", message: "Password reset email delivery is disabled." },
        "Fallback",
        translateError,
      ),
    ).toBe("errors.passwordResetDisabled");
  });

  it("falls through to prose for a code it does not recognize", () => {
    expect(
      getAuthErrorMessage(
        { code: "SOMETHING_NEW", message: "Invalid email or password" },
        "Fallback",
        translateError,
      ),
    ).toBe("Invalid email or password");
  });

  it("uses an authentication error message when one is available", () => {
    expect(
      getAuthErrorMessage({ message: "Invalid email or password" }, "Fallback", translateError),
    ).toBe("Invalid email or password");
    expect(getAuthErrorMessage(new Error("Request failed"), "Fallback", translateError)).toBe(
      "Request failed",
    );
  });

  it("uses the safe fallback for unknown or empty errors", () => {
    expect(getAuthErrorMessage({ message: "" }, "Unable to sign in.", translateError)).toBe(
      "Unable to sign in.",
    );
    expect(getAuthErrorMessage(null, "Unable to sign in.", translateError)).toBe(
      "Unable to sign in.",
    );
  });

  it("does not expose browser transport errors as user-facing copy", () => {
    expect(
      getAuthErrorMessage(new TypeError("Failed to fetch"), "Unable to sign in.", translateError),
    ).toBe("Unable to sign in.");
  });
});
