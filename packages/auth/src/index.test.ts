import { describe, expect, it } from "vite-plus/test";
import { hasPermission, type Session } from "./index";

const session = (role: Session["user"]["role"]): Session => ({
  user: {
    id: "usr_1",
    email: "person@voidmix.local",
    displayName: "Person",
    role,
  },
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
});

describe("hasPermission", () => {
  it("grants administrative access to admins", () => {
    expect(hasPermission(session("admin"), "admin.users.write")).toBe(true);
  });

  it("denies administrative access to regular users", () => {
    expect(hasPermission(session("user"), "admin.users.read")).toBe(false);
  });
});
