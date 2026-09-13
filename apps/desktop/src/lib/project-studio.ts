import { createApiClient, type ApiClient } from "@voidmix/client";
import { env } from "../env";
import { getDesktopLocaleHeaders } from "../i18n/client";

export type StudioProject = Awaited<
  ReturnType<ApiClient["v2"]["projects"]["list"]>
>["items"][number];
export type StudioDetail = Awaited<ReturnType<ApiClient["v2"]["projects"]["get"]>>["project"];
export type StudioLibrary = Awaited<ReturnType<ApiClient["library"]["search"]>>;
export type StudioLoad<T> =
  | { status: "preview"; data: T }
  | { status: "loaded"; data: T }
  | { status: "unavailable"; data: null };

export type PreviewProjectTitleKey =
  | "northstarLaunchFilmTitle"
  | "brandCampaignTitle"
  | "soundDesignTitle";

export type PreviewProjectDescriptionKey =
  | "northstarLaunchFilmDescription"
  | "brandCampaignDescription"
  | "soundDesignDescription";

export type PreviewProject = {
  id: string;
  titleKey: PreviewProjectTitleKey;
  descriptionKey: PreviewProjectDescriptionKey;
  stage: "draft" | "in_progress" | "review" | "delivered";
  progress: number;
  deadline: Date;
  taskCount: number;
  taskTotal: number;
};

export type PreviewAssetProjectKey = PreviewProjectTitleKey;

export type PreviewAsset = {
  id: string;
  name: string;
  projectTitleKey: PreviewAssetProjectKey;
  sizeBytes: number;
  type: "video" | "brief" | "audio";
};

export const previewProjects: readonly PreviewProject[] = [
  {
    id: "northstar",
    titleKey: "northstarLaunchFilmTitle",
    descriptionKey: "northstarLaunchFilmDescription",
    stage: "review",
    progress: 0.72,
    deadline: new Date("2026-09-18"),
    taskCount: 8,
    taskTotal: 11,
  },
  {
    id: "campaign",
    titleKey: "brandCampaignTitle",
    descriptionKey: "brandCampaignDescription",
    stage: "in_progress",
    progress: 0.38,
    deadline: new Date("2026-09-26"),
    taskCount: 3,
    taskTotal: 9,
  },
  {
    id: "sound",
    titleKey: "soundDesignTitle",
    descriptionKey: "soundDesignDescription",
    stage: "draft",
    progress: 0.12,
    deadline: new Date("2026-10-02"),
    taskCount: 1,
    taskTotal: 8,
  },
] as const;

export const previewAssets: readonly PreviewAsset[] = [
  {
    id: "launch-film",
    name: "launch-film-v07.mov",
    projectTitleKey: "northstarLaunchFilmTitle",
    sizeBytes: 1.8 * 1024 ** 3,
    type: "video",
  },
  {
    id: "campaign-brief",
    name: "campaign-brief.pdf",
    projectTitleKey: "brandCampaignTitle",
    sizeBytes: 2.4 * 1024 ** 2,
    type: "brief",
  },
  {
    id: "sound-mix",
    name: "sound-mix-01.wav",
    projectTitleKey: "soundDesignTitle",
    sizeBytes: 184 * 1024 ** 2,
    type: "audio",
  },
] as const;

function getClient(): ApiClient {
  return createApiClient({
    ...(env.VITE_API_URL ? { baseUrl: env.VITE_API_URL } : {}),
    headers: getDesktopLocaleHeaders,
    fetch: (input, init) => globalThis.fetch(input, { ...init, credentials: "include" }),
  });
}

export async function loadProjects(): Promise<
  StudioLoad<StudioProject[] | readonly PreviewProject[]>
> {
  if (!env.VITE_API_URL) return { status: "preview", data: previewProjects };
  try {
    const result = await getClient().v2.projects.list({});
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
    const result = await getClient().v2.projects.get({ projectId });
    return { status: "loaded", data: result.project };
  } catch {
    return { status: "unavailable", data: null };
  }
}

export async function createProject(title: string): Promise<StudioProject> {
  return getClient().v2.projects.create({
    scope: { type: "personal" },
    title: title.trim(),
    description: null,
  });
}

export async function loadLibrary(): Promise<StudioLoad<StudioLibrary | readonly PreviewAsset[]>> {
  if (!env.VITE_API_URL) return { status: "preview", data: previewAssets };
  try {
    return { status: "loaded", data: await getClient().library.search({ limit: 100 }) };
  } catch {
    return { status: "unavailable", data: null };
  }
}
