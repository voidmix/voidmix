import type { StudioSnapshot } from "../projects/types";

export interface LibraryBrief {
  id: string;
  projectId: string;
  title: string;
  description: string;
  milestone: string;
}

export function getLibraryBriefs(snapshot: StudioSnapshot): LibraryBrief[] {
  return snapshot.projects.map((project) => ({
    id: `brief:${project.id}`,
    projectId: project.id,
    title: project.name,
    description: project.description,
    milestone: project.milestone,
  }));
}

export function filterLibraryBriefs(briefs: readonly LibraryBrief[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return briefs;
  return briefs.filter((brief) =>
    [brief.title, brief.description, brief.milestone].some((value) =>
      value.toLocaleLowerCase().includes(normalized),
    ),
  );
}
