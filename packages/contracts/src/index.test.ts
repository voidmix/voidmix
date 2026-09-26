import { describe, expect, it } from "vite-plus/test";

import { userSchema, projectScopeV2Schema, projectV2Schema } from "./index.js";

describe("userSchema", () => {
  it("preserves native Date values for the RPC protocol", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const user = userSchema.parse({
      id: "user-1",
      email: "person@example.com",
      displayName: "Person",
      role: "user",
      status: "active",
      createdAt,
    });

    expect(user.createdAt).toBe(createdAt);
  });
});

describe("V2 account-first project contract", () => {
  it("models personal projects without a client-supplied owner id", () => {
    const timestamp = new Date("2026-09-12T00:00:00.000Z");
    expect(projectScopeV2Schema.parse({ type: "personal" })).toEqual({ type: "personal" });
    expect(
      projectV2Schema.parse({
        id: "project-v2-1",
        createdByUserId: "user-1",
        personalOwnerId: "user-1",
        organizationId: null,
        title: "Personal project",
        description: null,
        stage: "draft",
        archived: false,
        deadline: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }).createdAt,
    ).toBe(timestamp);
  });

  it("rejects a project with both ownership scopes", () => {
    expect(() =>
      projectV2Schema.parse({
        id: "project-v2-1",
        createdByUserId: "user-1",
        personalOwnerId: "user-1",
        organizationId: "org-1",
        title: "Invalid project",
        description: null,
        stage: "draft",
        archived: false,
        deadline: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });
});
