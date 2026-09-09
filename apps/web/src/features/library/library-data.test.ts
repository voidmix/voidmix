import { describe, expect, it } from "vite-plus/test";
import { filterLibraryBriefs, getLibraryBriefs } from "./library-data";

const snapshot = {
  version: 1 as const,
  projects: [
    {
      id: "film",
      name: "Launch film",
      description: "A clear story for the next chapter.",
      status: "active" as const,
      milestone: "Final review",
      updatedAt: new Date("2026-09-06T08:00:00Z"),
    },
    {
      id: "campaign",
      name: "Brand campaign",
      description: "A campaign brief for the next release.",
      status: "active" as const,
      milestone: "Creative brief",
      updatedAt: new Date("2026-09-05T12:00:00Z"),
    },
  ],
  tasks: [],
  activity: [],
  sessions: [],
};

describe("library data", () => {
  it("derives one brief from each project", () => {
    expect(getLibraryBriefs(snapshot)).toMatchObject([
      { id: "brief:film", projectId: "film", title: "Launch film" },
      { id: "brief:campaign", projectId: "campaign", title: "Brand campaign" },
    ]);
  });

  it("searches title, description, and milestone", () => {
    const briefs = getLibraryBriefs(snapshot);

    expect(filterLibraryBriefs(briefs, "NEXT RELEASE")).toHaveLength(1);
    expect(filterLibraryBriefs(briefs, "final review")).toHaveLength(1);
    expect(filterLibraryBriefs(briefs, "missing")).toHaveLength(0);
  });

  it("searches localized display values supplied by the owning view", () => {
    const briefs = getLibraryBriefs(snapshot);

    expect(
      filterLibraryBriefs(briefs, "localized", (brief) =>
        brief.id === "brief:film" ? ["Localized project title"] : [],
      ),
    ).toHaveLength(1);
  });
});
