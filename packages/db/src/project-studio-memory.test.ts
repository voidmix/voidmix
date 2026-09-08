import { describe, expect, it } from "vite-plus/test";

import {
  InMemoryActivityRepository,
  InMemoryFeedbackRepository,
  InMemoryReviewRepository,
} from "./project-studio-memory.js";

const firstNow = new Date("2026-09-09T00:00:00.000Z");

describe("Project Studio in-memory repositories", () => {
  it("creates, pages, updates, and resolves reviews with injected time and ids", async () => {
    let now = firstNow;
    let sequence = 0;
    const reviews = new InMemoryReviewRepository([], {
      now: () => now,
      id: () => `review-${++sequence}`,
    });

    const review = await reviews.create({
      projectId: "project-1",
      workspaceId: "workspace-1",
      targetVersionId: null,
      title: "Initial review",
      requestedBy: "account-1",
    });
    expect(review).toMatchObject({ id: "review-1", status: "draft" });

    now = new Date("2026-09-09T01:00:00.000Z");
    await reviews.update({ id: review.id, status: "open" });
    const resolved = await reviews.resolve({ id: review.id, actorId: "reviewer-1" });
    expect(resolved).toMatchObject({ status: "closed", resolvedBy: "reviewer-1" });

    const page = await reviews.list({ projectId: "project-1", limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();

    resolved.title = "mutated outside repository";
    resolved.updatedAt.setFullYear(2000);
    await expect(reviews.getById(review.id)).resolves.toMatchObject({
      title: "Initial review",
      updatedAt: new Date("2026-09-09T01:00:00.000Z"),
    });
  });

  it("creates and resolves feedback while preserving pagination and copies", async () => {
    let sequence = 0;
    const feedback = new InMemoryFeedbackRepository([], {
      now: () => firstNow,
      id: () => `feedback-${++sequence}`,
    });
    const first = await feedback.create({
      reviewId: "review-1",
      projectId: "project-1",
      targetVersionId: "version-1",
      authorId: "account-1",
      body: "Adjust the opening frame.",
    });
    await feedback.create({
      reviewId: "review-1",
      projectId: "project-1",
      targetVersionId: "version-1",
      authorId: "account-2",
      body: "The close is ready.",
    });

    const firstPage = await feedback.list({ reviewId: "review-1", limit: 1 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).toBe("1");
    const secondPage = await feedback.list({
      reviewId: "review-1",
      limit: 1,
      ...(firstPage.nextCursor ? { cursor: firstPage.nextCursor } : {}),
    });
    expect(secondPage.items).toHaveLength(1);

    const resolved = await feedback.update({
      id: first.id,
      status: "resolved",
      actorId: "reviewer-1",
    });
    expect(resolved).toMatchObject({ status: "resolved", resolvedBy: "reviewer-1" });
    resolved.body = "changed outside repository";
    await expect(feedback.getById(first.id)).resolves.toMatchObject({
      body: "Adjust the opening frame.",
    });
  });

  it("lists activity by account and project in stable descending order", async () => {
    let sequence = 0;
    const activity = new InMemoryActivityRepository([], {
      now: () => firstNow,
      id: () => `activity-${++sequence}`,
    });
    const occurredAt = new Date("2026-09-09T00:00:00.000Z");
    const created = await activity.create({
      type: "project.created",
      accountId: "account-1",
      workspaceId: "workspace-1",
      projectId: "project-1",
      actorId: "account-1",
      targetId: "project-1",
      summary: "Created project",
      occurredAt,
    });
    occurredAt.setFullYear(2000);
    created.occurredAt.setFullYear(1999);
    await expect(activity.listByProject("project-1", { limit: 10 })).resolves.toMatchObject({
      items: [{ occurredAt: new Date("2026-09-09T00:00:00.000Z") }],
    });
    await activity.create({
      type: "feedback.created",
      accountId: "account-2",
      workspaceId: "workspace-2",
      projectId: "project-2",
      actorId: "account-2",
      targetId: "feedback-1",
      summary: "Added feedback",
      occurredAt: new Date("2026-09-09T02:00:00.000Z"),
    });
    await activity.create({
      type: "review.created",
      accountId: "account-1",
      workspaceId: "workspace-1",
      projectId: "project-1",
      actorId: "account-1",
      targetId: "review-1",
      summary: "Started review",
      occurredAt: new Date("2026-09-09T03:00:00.000Z"),
    });

    const accountPage = await activity.listByAccount("account-1", { limit: 10 });
    expect(accountPage.items.map((item) => item.type)).toEqual([
      "review.created",
      "project.created",
    ]);
    const projectPage = await activity.listByProject("project-1", { limit: 1 });
    expect(projectPage.items[0]?.type).toBe("review.created");
    expect(projectPage.nextCursor).toBe("1");
  });
});
