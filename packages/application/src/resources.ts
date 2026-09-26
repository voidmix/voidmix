import type { ProjectApplication } from "./types.js";
import { requireResource, requiredText, type ProjectContext } from "./context.js";
export function resourcesCommands({ options, now, id, requireProject }: ProjectContext) {
  const commands: Pick<
    ProjectApplication,
    | "listTasks"
    | "createTask"
    | "updateTask"
    | "listReviews"
    | "createReview"
    | "updateReview"
    | "listFeedback"
    | "createFeedback"
  > = {
    async listTasks({ actorId, projectId }) {
      await requireProject(actorId, projectId, "project.read", "Task access denied.");
      return options.tasks.listByProject(projectId);
    },

    async createTask({ actorId, projectId, title }) {
      const project = await requireProject(
        actorId,
        projectId,
        "project.write",
        "Task access denied.",
      );
      const trimmed = requiredText(title, "Task title");
      return options.tasks.create({
        id: id(),
        projectId: project.id,
        createdByUserId: actorId,
        title: trimmed,
        now: now(),
      });
    },

    async updateTask({ actorId, taskId, title, status }) {
      const task = requireResource(await options.tasks.getById(taskId), "Task access denied.");
      await requireProject(actorId, task.projectId, "project.write", "Task access denied.");
      const updated = await options.tasks.update({
        id: taskId,
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(status !== undefined ? { status } : {}),
        now: now(),
      });
      return requireResource(updated, "Task access denied.");
    },

    async listReviews({ actorId, projectId }) {
      await requireProject(actorId, projectId, "project.read", "Review access denied.");
      return options.reviews.listByProject(projectId);
    },

    async createReview({ actorId, projectId, assetVersionId, title }) {
      await requireProject(actorId, projectId, "project.write", "Review creation denied.");
      const normalizedTitle = requiredText(title, "Review title");
      return options.reviews.create({
        id: id(),
        projectId,
        assetVersionId,
        createdByUserId: actorId,
        title: normalizedTitle,
        now: now(),
      });
    },

    async updateReview({ actorId, reviewId, status }) {
      const review = requireResource(
        await options.reviews.getById(reviewId),
        "Review access denied.",
      );
      await requireProject(actorId, review.projectId, "project.manage", "Review approval denied.");
      const updated = await options.reviews.update({ id: reviewId, status, now: now() });
      return requireResource(updated, "Review access denied.");
    },

    async listFeedback({ actorId, reviewId }) {
      const review = requireResource(
        await options.reviews.getById(reviewId),
        "Feedback access denied.",
      );
      await requireProject(actorId, review.projectId, "project.read", "Feedback access denied.");
      return options.feedback.listByReview(reviewId);
    },

    async createFeedback({ actorId, reviewId, body }) {
      const review = requireResource(
        await options.reviews.getById(reviewId),
        "Feedback creation denied.",
      );
      await requireProject(
        actorId,
        review.projectId,
        "project.comment",
        "Feedback creation denied.",
      );
      const normalizedBody = requiredText(body, "Feedback body");
      return options.feedback.create({
        id: id(),
        reviewId,
        projectId: review.projectId,
        authorId: actorId,
        body: normalizedBody,
        now: now(),
      });
    },
  };
  return commands;
}
