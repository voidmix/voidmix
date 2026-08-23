import { describe, expect, it } from "vite-plus/test";

import { isChunkLoadError, shouldRetryChunkLoad } from "./chunk-recovery";

describe("chunk recovery", () => {
  it.each([
    "Failed to fetch dynamically imported module: /register.tsx",
    "Importing a module script failed.",
    "error loading dynamically imported module",
  ])("recognizes a route chunk load failure: %s", (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it("does not treat application errors as chunk failures", () => {
    expect(isChunkLoadError(new Error("User not found"))).toBe(false);
    expect(isChunkLoadError({ message: "Failed to fetch" })).toBe(false);
  });

  it("allows the first retry and stale retries", () => {
    expect(shouldRetryChunkLoad({ previous: null, url: "/register", now: 20_000 })).toBe(true);
    expect(
      shouldRetryChunkLoad({
        previous: JSON.stringify({ url: "/register", attemptedAt: 1_000 }),
        url: "/register",
        now: 20_000,
      }),
    ).toBe(true);
  });

  it("blocks a repeated retry for the same URL inside the recovery window", () => {
    expect(
      shouldRetryChunkLoad({
        previous: JSON.stringify({ url: "/register", attemptedAt: 15_000 }),
        url: "/register",
        now: 20_000,
      }),
    ).toBe(false);
  });

  it("does not let an invalid or future record create a reload loop", () => {
    expect(shouldRetryChunkLoad({ previous: "not-json", url: "/register", now: 20_000 })).toBe(
      false,
    );
    expect(
      shouldRetryChunkLoad({
        previous: JSON.stringify({ url: "/register", attemptedAt: 21_000 }),
        url: "/register",
        now: 20_000,
      }),
    ).toBe(false);
  });

  it("allows recovery for a different URL", () => {
    expect(
      shouldRetryChunkLoad({
        previous: JSON.stringify({ url: "/login", attemptedAt: 19_000 }),
        url: "/register",
        now: 20_000,
      }),
    ).toBe(true);
  });
});
