import { createApiClient, type ApiClient } from "@voidmix/client";
import { env } from "../env";

export type StudioProject = Awaited<ReturnType<ApiClient["projects"]["list"]>>["items"][number];
export type StudioDetail = Awaited<ReturnType<ApiClient["projects"]["get"]>>;
export type StudioLibrary = Awaited<ReturnType<ApiClient["library"]["search"]>>;
export type StudioLoad<T> =
  | { status: "preview"; data: T }
  | { status: "loaded"; data: T }
  | { status: "unavailable"; data: null };

export const previewProjects = [
  {
    id: "northstar",
    title: "Northstar / Launch film",
    description: "A clear story for the next chapter.",
    stage: "review",
    progress: 0.72,
    deadline: new Date("2026-09-18"),
    tasks: "8 of 11 tasks",
  },
  {
    id: "campaign",
    title: "Q3 / Brand campaign",
    description: "Make the next campaign feel unmistakably ours.",
    stage: "in_progress",
    progress: 0.38,
    deadline: new Date("2026-09-26"),
    tasks: "3 of 9 tasks",
  },
  {
    id: "sound",
    title: "Northstar / Sound design",
    description: "A sonic identity for the launch.",
    stage: "draft",
    progress: 0.12,
    deadline: new Date("2026-10-02"),
    tasks: "1 of 8 tasks",
  },
] as const;
export const previewAssets = [
  {
    id: "launch-film",
    name: "launch-film-v07.mov",
    detail: "Northstar / Launch film · 1.8 GB",
    type: "video",
  },
  {
    id: "campaign-brief",
    name: "campaign-brief.pdf",
    detail: "Q3 / Brand campaign · 2.4 MB",
    type: "brief",
  },
  {
    id: "sound-mix",
    name: "sound-mix-01.wav",
    detail: "Northstar / Sound design · 184 MB",
    type: "audio",
  },
] as const;
export type PreviewProject = (typeof previewProjects)[number];
export type PreviewAsset = (typeof previewAssets)[number];

function getClient(): ApiClient {
  return createApiClient({
    ...(env.VITE_API_URL ? { baseUrl: env.VITE_API_URL } : {}),
    fetch: (input, init) => globalThis.fetch(input, { ...init, credentials: "include" }),
  });
}

export async function loadProjects(): Promise<
  StudioLoad<StudioProject[] | readonly PreviewProject[]>
> {
  if (!env.VITE_API_URL) return { status: "preview", data: previewProjects };
  try {
    const result = await getClient().projects.list({ limit: 100 });
    return { status: "loaded", data: result.items };
  } catch {
    return { status: "unavailable", data: null };
  }
}

export async function loadProject(
  projectId: string,
): Promise<StudioLoad<StudioDetail | PreviewProject | null>> {
  if (!env.VITE_API_URL)
    return {
      status: "preview",
      data: previewProjects.find((project) => project.id === projectId) ?? null,
    };
  try {
    return { status: "loaded", data: await getClient().projects.get({ projectId }) };
  } catch {
    return { status: "unavailable", data: null };
  }
}

export async function loadLibrary(): Promise<StudioLoad<StudioLibrary | readonly PreviewAsset[]>> {
  if (!env.VITE_API_URL) return { status: "preview", data: previewAssets };
  try {
    return { status: "loaded", data: await getClient().library.search({ limit: 100 }) };
  } catch {
    return { status: "unavailable", data: null };
  }
}
