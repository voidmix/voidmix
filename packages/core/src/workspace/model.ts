import { DomainError } from "../shared/errors.js";

export const workspaceMembershipRoles = ["owner", "editor", "viewer"] as const;
export type WorkspaceMembershipRole = (typeof workspaceMembershipRoles)[number];

export const workspaceMembershipStatuses = ["active", "suspended"] as const;
export type WorkspaceMembershipStatus = (typeof workspaceMembershipStatuses)[number];

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMembershipRole;
  status: WorkspaceMembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMembershipRepository {
  getByUserAndWorkspace(input: {
    userId: string;
    workspaceId: string;
  }): Promise<WorkspaceMembership | null>;
}

export type WorkspaceAccess = "read" | "write";

export class WorkspaceAccessError extends DomainError<"WORKSPACE_ACCESS_DENIED"> {
  constructor(message = "Workspace access denied.") {
    super("WORKSPACE_ACCESS_DENIED", message);
    this.name = "WorkspaceAccessError";
  }
}
