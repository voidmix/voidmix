import {
  WorkspaceAccessError,
  type WorkspaceAccess,
  type WorkspaceMembership,
  type WorkspaceMembershipRepository,
} from "./model.js";

export interface WorkspaceAccessAdministration {
  getMembership(input: {
    actorId: string;
    workspaceId: string;
  }): Promise<WorkspaceMembership | null>;
  canRead(input: { actorId: string; workspaceId: string }): Promise<boolean>;
  canWrite(input: { actorId: string; workspaceId: string }): Promise<boolean>;
  assertRead(input: { actorId: string; workspaceId: string }): Promise<WorkspaceMembership>;
  assertWrite(input: { actorId: string; workspaceId: string }): Promise<WorkspaceMembership>;
  assert(input: {
    actorId: string;
    workspaceId: string;
    access: WorkspaceAccess;
  }): Promise<WorkspaceMembership>;
}

export function createWorkspaceAccessAdministration({
  memberships,
}: {
  memberships: WorkspaceMembershipRepository;
}): WorkspaceAccessAdministration {
  const getMembership = (input: { actorId: string; workspaceId: string }) =>
    memberships.getByUserAndWorkspace({
      userId: input.actorId,
      workspaceId: input.workspaceId,
    });

  const canRead = async (input: { actorId: string; workspaceId: string }) => {
    const membership = await getMembership(input);
    return membership?.status === "active";
  };

  const canWrite = async (input: { actorId: string; workspaceId: string }) => {
    const membership = await getMembership(input);
    return (
      membership?.status === "active" &&
      (membership.role === "owner" || membership.role === "editor")
    );
  };

  const assert = async (input: {
    actorId: string;
    workspaceId: string;
    access: WorkspaceAccess;
  }) => {
    const membership = await getMembership(input);
    const granted =
      membership?.status === "active" &&
      (input.access === "read" || membership.role === "owner" || membership.role === "editor");
    if (!membership || !granted) throw new WorkspaceAccessError();
    return membership;
  };

  return {
    getMembership,
    canRead,
    canWrite,
    assert,
    assertRead: (input) => assert({ ...input, access: "read" }),
    assertWrite: (input) => assert({ ...input, access: "write" }),
  };
}
