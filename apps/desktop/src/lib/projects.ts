import { createApiClient, type ApiClient } from "@voidmix/client";
import { env } from "../env";
import { getDesktopLocaleHeaders } from "../i18n/client";

export type StudioProject = Awaited<ReturnType<ApiClient["projects"]["list"]>>["items"][number];
export type StudioDetail = Awaited<ReturnType<ApiClient["projects"]["get"]>>["project"];
export type StudioLoad<T> = { status: "loaded"; data: T } | { status: "unavailable"; data: null };

function getClient(): ApiClient {
  return createApiClient({
    ...(env.VITE_API_URL ? { baseUrl: env.VITE_API_URL } : {}),
    headers: getDesktopLocaleHeaders,
    fetch: (input, init) => globalThis.fetch(input, { ...init, credentials: "include" }),
  });
}

export async function loadProjects(): Promise<StudioLoad<StudioProject[]>> {
  if (!env.VITE_API_URL) return { status: "unavailable", data: null };
  try {
    const result = await getClient().projects.list({});
    return { status: "loaded", data: result.items };
  } catch {
    return { status: "unavailable", data: null };
  }
}

export async function loadProject(projectId: string): Promise<StudioLoad<StudioDetail | null>> {
  if (!env.VITE_API_URL) return { status: "unavailable", data: null };
  try {
    const result = await getClient().projects.get({ projectId });
    return { status: "loaded", data: result.project };
  } catch {
    return { status: "unavailable", data: null };
  }
}

export async function createProject(title: string): Promise<StudioProject> {
  return getClient().projects.create({ title: title.trim() });
}
