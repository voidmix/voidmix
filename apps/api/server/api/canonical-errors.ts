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
  if (error instanceof ProjectV2DomainError) {
    switch (error.code) {
      case "PROJECT_MEMBER_NOT_FOUND":
        return createApiError("NOT_FOUND", error.code);
      case "PROJECT_MEMBER_INVALID_ROLE":
      case "PROJECT_SCOPE_INVALID":
        return createApiError("BAD_REQUEST", error.code);
      case "PROJECT_ACCESS_DENIED":
        return createApiError("FORBIDDEN", error.code);
    }
  }
  if (error instanceof AgentRunV2DomainError) {
    switch (error.code) {
      case "AGENT_RUN_INVALID_INPUT":
        return createApiError("BAD_REQUEST", error.code);
      case "AGENT_RUN_TERMINAL":
        return createApiError("CONFLICT", error.code);
    }
  }
  if (error instanceof DomainError) {
    switch (error.code) {
      case "USER_NOT_FOUND":
        return createApiError("NOT_FOUND", error.code);
      case "SELF_SUSPENSION":
      case "LAST_ADMIN":
      case "EMAIL_ALREADY_EXISTS":
        return createApiError("CONFLICT", error.code);
      case "BAD_REQUEST":
        return createApiError("BAD_REQUEST", error.code);
    }
  }
  return new ORPCError("INTERNAL_SERVER_ERROR", {
    data: { error: { code: "INTERNAL_SERVER_ERROR" } },
    cause: error,
  });
}
