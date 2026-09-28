import { describe, expect, it } from "vite-plus/test";
import {
  userStatuses,
  projectStagesV2,
  projectMemberRolesV2,
  organizationRolesV2,
  membershipStatusesV2,
  taskStatusesV2,
  reviewStatusesV2,
  agentRunStatusesV2,
  type AuditAction,
  type AuditTargetType,
  type User,
} from "@voidmix/core";
import {
  roleSchema,
  userStatusSchema,
  auditEventSchema,
  projectStageV2Schema,
  projectMemberRoleV2Schema,
  organizationRoleV2Schema,
  projectMemberV2Schema,
  organizationMemberV2Schema,
  projectTaskStatusV2Schema,
  reviewStatusV2Schema,
  agentRunStatusV2Schema,
} from "@voidmix/contracts";
import {
  roleEnum,
  userStatusEnum,
  auditActionEnum,
  auditTargetTypeEnum,
  projectStageEnum,
  v2ProjectMemberRoleEnum,
  organizationRoleEnum,
  v2ProjectMemberStatusEnum,
  organizationMembershipStatusEnum,
  projectTaskStatusEnum,
  v2ReviewStatusEnum,
  v2AgentRunStatusEnum,
} from "@voidmix/db/schema";
const roles = { user: true, admin: true, owner: true } satisfies Record<User["role"], true>;
const actions = {
  "user.status.changed": true,
  "admin.created": true,
  "system.settings.updated": true,
  "system.mail.test.sent": true,
} satisfies Record<AuditAction, true>;
const targets = { user: true, system_setting: true } satisfies Record<AuditTargetType, true>;
describe("Core/Contracts/PostgreSQL enum parity", () => {
  it.each([
    ["role", Object.keys(roles), roleSchema.options, roleEnum.enumValues],
    ["user status", userStatuses, userStatusSchema.options, userStatusEnum.enumValues],
    [
      "audit action",
      Object.keys(actions),
      auditEventSchema.shape.action.options,
      auditActionEnum.enumValues,
    ],
    [
      "audit target",
      Object.keys(targets),
      auditEventSchema.shape.targetType.options,
      auditTargetTypeEnum.enumValues,
    ],
    ["project stage", projectStagesV2, projectStageV2Schema.options, projectStageEnum.enumValues],
    [
      "project role",
      projectMemberRolesV2,
      projectMemberRoleV2Schema.options,
      v2ProjectMemberRoleEnum.enumValues,
    ],
    [
      "organization role",
      organizationRolesV2,
      organizationRoleV2Schema.options,
      organizationRoleEnum.enumValues,
    ],
    [
      "project membership",
      membershipStatusesV2,
      projectMemberV2Schema.shape.status.options,
      v2ProjectMemberStatusEnum.enumValues,
    ],
    [
      "organization membership",
      membershipStatusesV2,
      organizationMemberV2Schema.shape.status.options,
      organizationMembershipStatusEnum.enumValues,
    ],
    [
      "task status",
      taskStatusesV2,
      projectTaskStatusV2Schema.options,
      projectTaskStatusEnum.enumValues,
    ],
    [
      "review status",
      reviewStatusesV2,
      reviewStatusV2Schema.options,
      v2ReviewStatusEnum.enumValues,
    ],
    [
      "agent status",
      agentRunStatusesV2,
      agentRunStatusV2Schema.options,
      v2AgentRunStatusEnum.enumValues,
    ],
  ])("keeps %s identical", (_name, core, contract, db) => {
    expect(new Set(contract)).toEqual(new Set(core));
    expect(new Set(db)).toEqual(new Set(core));
  });
});
