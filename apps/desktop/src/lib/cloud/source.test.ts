import { describe, expect, it } from "vite-plus/test";
import { demoCloudSnapshot } from "./demo";
import { selectCloudSnapshot } from "./source";

describe("cloud source selection", () => {
  it("uses preview data when no API URL is configured", async () => {
    await expect(selectCloudSnapshot(undefined)).resolves.toEqual({
      snapshot: demoCloudSnapshot,
      source: "demo",
    });
  });

  it("returns remote data when the connected source loads", async () => {
    const result = await selectCloudSnapshot("https://api.example.test", async (apiUrl) => {
      expect(apiUrl).toBe("https://api.example.test");
      return { kind: "loaded", snapshot: demoCloudSnapshot };
    });

    expect(result).toEqual({ snapshot: demoCloudSnapshot, source: "cloud" });
  });

  it.each([
    ["invalid_snapshot", "connected"],
    ["overview_unavailable", "connected"],
    ["health_check_failed", "demo"],
  ] as const)("maps %s to the expected fallback source", async (kind, source) => {
    const result = await selectCloudSnapshot("https://api.example.test", async () => ({ kind }));
    expect(result).toEqual({ snapshot: demoCloudSnapshot, source });
  });
});
