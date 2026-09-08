import type { WorkspaceMembershipRole } from "../workspace/model.js";

export const projectMemberRoles = ["owner", "editor", "commenter", "viewer"] as const;
export type ProjectMemberRole = (typeof projectMemberRoles)[number];
export const projectMemberStatuses = ["active", "removed"] as const;
export type ProjectMemberStatus = (typeof projectMemberStatuses)[number];

export interface ProjectMember {
  id: string;
  projectId: string;
  workspaceId: string;
  userId: string;
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberRepository {
  listByProject(projectId: string): Promise<ProjectMember[]>;
  getByProjectAndUser(input: { projectId: string; userId: string }): Promise<ProjectMember | null>;
  upsert(input: Omit<ProjectMember, "id" | "createdAt" | "updatedAt">): Promise<ProjectMember>;
  remove(input: { projectId: string; userId: string }): Promise<ProjectMember>;
}

export type ProjectAccess = "read" | "comment" | "write" | "manage";

const rank: Record<ProjectAccess, number> = { read: 1, comment: 2, write: 3, manage: 4 };
function atMost(value: ProjectAccess, ceiling: ProjectAccess): ProjectAccess {
  return rank[value] <= rank[ceiling] ? value : ceiling;
}

export function resolveProjectAccess(input: {
  workspaceRole: WorkspaceMembershipRole;
  projectMember?: Pick<ProjectMember, "role" | "status"> | null;
  isProjectOwner?: boolean;
}): ProjectAccess {
  if (input.workspaceRole === "viewer") return "read";
  const member = input.projectMember;
  if (member?.status === "removed") return "read";
  const workspaceAccess: ProjectAccess = input.workspaceRole === "owner" ? "manage" : "write";
  if (!member && !input.isProjectOwner) return workspaceAccess;
  const projectAccess: ProjectAccess =
    input.isProjectOwner || member?.role === "owner"
      ? "manage"
      : member?.role === "editor"
        ? "write"
        : member?.role === "commenter"
          ? "comment"
          : "read";
  return atMost(projectAccess, workspaceAccess);
}
