import { createApiClient, type ApiClient } from "@voidmix/client";
import { env } from "../env";
import { getDesktopLocaleHeaders } from "../i18n/client";

export type StudioProject = Awaited<ReturnType<ApiClient["projects"]["list"]>>["items"][number];
export type StudioProjectPage = Awaited<ReturnType<ApiClient["projects"]["list"]>>;
export type StudioDetail = Awaited<ReturnType<ApiClient["projects"]["get"]>>["project"];
export type StudioLoad<T> = { status: "loaded"; data: T } | { status: "unavailable"; data: null };

function getClient(): ApiClient {
  return createApiClient({
    ...(env.VITE_API_URL ? { baseUrl: env.VITE_API_URL } : {}),
    headers: getDesktopLocaleHeaders,
    fetch: (input, init) => globalThis.fetch(input, { ...init, credentials: "include" }),
  });
}

export async function loadProjects(
  signal?: AbortSignal,
  query: { cursor?: string } = {},
): Promise<StudioLoad<StudioProjectPage>> {
  if (!env.VITE_API_URL) return { status: "unavailable", data: null };
  try {
    const result = await getClient().projects.list({ limit: 50, ...query }, { signal });
    return { status: "loaded", data: result };
  } catch {
    signal?.throwIfAborted();
    return { status: "unavailable", data: null };
  }
}

export async function loadProject(
  projectId: string,
  signal?: AbortSignal,
): Promise<StudioLoad<StudioDetail | null>> {
  if (!env.VITE_API_URL) return { status: "unavailable", data: null };
  try {
    const result = await getClient().projects.get({ projectId }, { signal });
    return { status: "loaded", data: result.project };
  } catch {
    signal?.throwIfAborted();
    return { status: "unavailable", data: null };
  }
}

export async function createProject(title: string): Promise<StudioProject> {
  return getClient().projects.create({ title: title.trim() });
}
