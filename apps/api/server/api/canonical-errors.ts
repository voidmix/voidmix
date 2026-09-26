import { AgentRunV2DomainError, DomainError, ProjectV2DomainError } from "@voidmix/core";
import { ORPCError } from "@orpc/server";

type ApiErrorValues = Record<string, string | number | boolean | null>;

export function createApiError(
  transportCode: string,
  detailCode = transportCode,
  values?: ApiErrorValues,
): ORPCError<string, unknown> {
  return new ORPCError(transportCode, {
    data: {
      error: {
        code: detailCode,
        ...(values ? { values } : {}),
      },
    },
  });
}

export function mapDomainError(error: unknown): ORPCError<string, unknown> {
  if (error instanceof ORPCError) return error;
  const transportCode =
    error instanceof ProjectV2DomainError
      ? projectErrors[error.code]
      : error instanceof AgentRunV2DomainError
        ? agentErrors[error.code]
        : error instanceof DomainError
          ? userErrors[error.code]
          : undefined;
  if (transportCode && error instanceof Error && "code" in error) {
    return createApiError(transportCode, String(error.code));
  }
  return new ORPCError("INTERNAL_SERVER_ERROR", {
    data: { error: { code: "INTERNAL_SERVER_ERROR" } },
    cause: error,
  });
}

const projectErrors = {
  PROJECT_MEMBER_NOT_FOUND: "NOT_FOUND",
  PROJECT_MEMBER_INVALID_ROLE: "BAD_REQUEST",
  PROJECT_SCOPE_INVALID: "BAD_REQUEST",
  PROJECT_ACCESS_DENIED: "FORBIDDEN",
} satisfies Record<ProjectV2DomainError["code"], string>;
const agentErrors = {
  AGENT_RUN_INVALID_INPUT: "BAD_REQUEST",
  AGENT_RUN_TERMINAL: "CONFLICT",
} satisfies Record<AgentRunV2DomainError["code"], string>;
const userErrors: Readonly<Record<string, string | undefined>> = {
  USER_NOT_FOUND: "NOT_FOUND",
  SELF_SUSPENSION: "CONFLICT",
  LAST_ADMIN: "CONFLICT",
  EMAIL_ALREADY_EXISTS: "CONFLICT",
  BAD_REQUEST: "BAD_REQUEST",
} satisfies Partial<Record<DomainError["code"], string>>;
