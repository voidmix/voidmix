import { describe, expect, it } from "vite-plus/test";
import {
  createDefaultAuthSettings,
  createPublicAuthCapabilities,
  createUserAdministration,
  type MailSettingsFallback,
  type User,
  type UserRepository,
} from "./index";

const unused = async (): Promise<never> => {
  throw new Error("unexpected repository call");
};

function repository(seed: User[]): UserRepository {
  const users = new Map(seed.map((user) => [user.id, user]));
  return {
    list: unused,
    getById: async (id) => users.get(id) ?? null,
    getByEmail: async (email) => [...users.values()].find((user) => user.email === email) ?? null,
    countActiveAdministrators: async () =>
      [...users.values()].filter(
        (user) => user.status === "active" && (user.role === "admin" || user.role === "owner"),
      ).length,
    save: async (user) => {
      users.set(user.id, user);
    },
    updateStatus: unused,
    appendAudit: async () => {},
    listAudit: unused,
  };
}

const admin: User = {
  id: "usr_admin",
  email: "admin@voidmix.local",
  displayName: "Admin",
  role: "admin",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const fallback: MailSettingsFallback = {
  enabled: { value: true, source: "default" },
  from: { value: null, source: "missing" },
  fromName: { value: "Voidmix", source: "default" },
  templatesBaseUrl: { value: null, source: "missing" },
  resendApiKey: { value: null, source: "missing" },
};

describe("user administration", () => {
  it.each([
    ["self-suspension", admin.id, "SELF_SUSPENSION"],
    ["final administrator", "operator", "LAST_ADMIN"],
  ])("rejects %s before mutation", async (_name, actorId, code) => {
    const service = createUserAdministration({ users: repository([admin]) });
    await expect(
      service.updateStatus({ actorId, userId: admin.id, status: "suspended" }),
    ).rejects.toMatchObject({ code });
  });

  it("creates an initial administrator idempotently", async () => {
    const service = createUserAdministration({ users: repository([]), id: () => "usr_created" });
    const input = { email: admin.email, displayName: admin.displayName };
    const first = await service.ensureAdmin(input);
    const second = await service.ensureAdmin(input);
    expect(second.id).toBe(first.id);
  });
});

describe("public auth capabilities", () => {
  it("exposes capabilities only when verification mail is configured", async () => {
    const service = createPublicAuthCapabilities({
      settings: {
        resolveAuthSettings: async () => createDefaultAuthSettings(),
        resolveMailConfiguration: async () => ({
          settings: {
            enabled: true,
            from: "mail@example.com",
            fromName: "Voidmix",
            templatesBaseUrl: null,
            configurationState: "incomplete",
            missing: ["RESEND_API_KEY", "MAIL_FROM"],
          },
          resendApiKey: null,
        }),
      },
      mailFallback: fallback,
    });
    await expect(service.get()).resolves.toEqual({
      registrationAvailable: false,
      verificationEmailRequestAvailable: false,
      passwordResetRequestAvailable: false,
    });
  });
});
