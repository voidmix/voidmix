import type { Session } from "@voidmix/auth";

export interface ApiRequestAuthContext {
  session: Session | null;
  user: Session["user"] | null;
}

export interface ApiRequestContext {
  requestId: string;
  auth: ApiRequestAuthContext;
}

export function createApiRequestAuthContext(session: Session | null): ApiRequestAuthContext {
  return {
    session,
    user: session?.user ?? null,
  };
}
