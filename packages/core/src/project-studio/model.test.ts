import { describe, expect, it } from "vite-plus/test";

import {
  assertFeedbackStatusTransition,
  assertReviewStatusTransition,
  ProjectStudioDomainError,
} from "./model.js";

describe("Project Studio review and feedback states", () => {
  it("allows the documented review workflow", () => {
    expect(() => assertReviewStatusTransition("draft", "open")).not.toThrow();
    expect(() => assertReviewStatusTransition("open", "changes_requested")).not.toThrow();
    expect(() => assertReviewStatusTransition("changes_requested", "open")).not.toThrow();
    expect(() => assertReviewStatusTransition("open", "approved")).not.toThrow();
    expect(() => assertReviewStatusTransition("approved", "closed")).not.toThrow();
  });

  it("rejects reopening a closed review and resolving feedback twice", () => {
    expect(() => assertReviewStatusTransition("closed", "open")).toThrow(ProjectStudioDomainError);
    expect(() => assertFeedbackStatusTransition("resolved", "open")).toThrow(
      ProjectStudioDomainError,
    );
  });
});
