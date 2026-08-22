import { describe, expect, it } from "vite-plus/test";
import { demoCloudSnapshot } from "./demo";
import { isCloudSnapshot } from "./validation";

describe("cloud snapshot validation", () => {
  it("accepts the deterministic preview shape", () => {
    expect(isCloudSnapshot(demoCloudSnapshot)).toBe(true);
  });

  it("rejects incomplete API responses", () => {
    expect(isCloudSnapshot({ fileCount: 1, pendingItems: 0, jobs: [], devices: [] })).toBe(false);
    expect(isCloudSnapshot(null)).toBe(false);
  });
});
