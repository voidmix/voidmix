import type { User } from "@voidmix/domain";
import { describe, expect, it } from "vite-plus/test";

import { InMemoryUserRepository } from "./memory.js";

const users: User[] = [
  {
    id: "user-1",
    email: "first@example.com",
    displayName: "First",
    role: "user",
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "user-2",
    email: "second@example.com",
    displayName: "Second",
    role: "admin",
    status: "active",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

describe("InMemoryUserRepository", () => {
  it("supports search and cursor pagination", async () => {
    const repository = new InMemoryUserRepository(users);
    const firstPage = await repository.list({ limit: 1 });
    const secondPage = await repository.list({
      limit: 1,
      ...(firstPage.nextCursor ? { cursor: firstPage.nextCursor } : {}),
    });

    expect(firstPage.items[0]?.id).toBe("user-2");
    expect(secondPage.items[0]?.id).toBe("user-1");
    expect((await repository.list({ limit: 10, query: "FIRST" })).total).toBe(1);
  });
});
