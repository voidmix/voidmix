import { describe, expect, it } from "vite-plus/test";
import { getPiRuntimeStatus, authorizeProjectFolder, createPiSession } from "./pi";

describe("Pi desktop bridge", () => {
  it("reports browser preview explicitly", async () => {
    await expect(getPiRuntimeStatus()).resolves.toMatchObject({ availability: "preview" });
    await expect(authorizeProjectFolder("/tmp/project")).resolves.toMatchObject({
      availability: "preview",
    });
  });
  it("rejects session creation in browser preview", async () => {
    await expect(createPiSession({ prompt: "inspect" })).rejects.toThrow("PI_PREVIEW_UNAVAILABLE");
  });
});
