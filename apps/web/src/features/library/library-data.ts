import type { StudioSnapshot, ProjectView } from "../projects/types";

export interface LibraryBrief {
  id: string;
  projectId: string;
  title: string;
  titleKey?: ProjectView["titleKey"];
  description: string;
  descriptionKey?: ProjectView["descriptionKey"];
  milestone: string;
  milestoneKey?: ProjectView["milestoneKey"];
}

export type LibraryBriefTextResolver = (brief: LibraryBrief) => readonly string[];

export function getLibraryBriefs(snapshot: StudioSnapshot): LibraryBrief[] {
  return snapshot.projects.map((project) => ({
    id: `brief:${project.id}`,
    projectId: project.id,
    title: project.name,
    ...(project.titleKey ? { titleKey: project.titleKey } : {}),
    description: project.description,
    ...(project.descriptionKey ? { descriptionKey: project.descriptionKey } : {}),
    milestone: project.milestone,
    ...(project.milestoneKey ? { milestoneKey: project.milestoneKey } : {}),
  }));
}

export function filterLibraryBriefs(
  briefs: readonly LibraryBrief[],
  query: string,
  resolveLocalizedText?: LibraryBriefTextResolver,
) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return briefs;
  return briefs.filter((brief) =>
    [
      brief.title,
      brief.description,
      brief.milestone,
      ...(resolveLocalizedText?.(brief) ?? []),
    ].some((value) => value.toLocaleLowerCase().includes(normalized)),
  );
}
