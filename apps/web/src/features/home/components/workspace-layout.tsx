import { useEffect, useState } from "react";

import { ActivitySection } from "./activity-section";
import { HomeNavbar } from "./home-navbar";
import { HomeSidebar } from "./sidebar";
import { MobileNavigation } from "./mobile-navigation";
import { ProjectContext } from "./project-context";
import { WorkspacePlaceholders } from "./workspace-placeholder";
import { type WorkspaceSectionId } from "../data";
import { ChatShell } from "../../chat/chat-shell";

const sectionIds = new Set<WorkspaceSectionId>([
  "overview",
  "inbox",
  "projects",
  "reviews",
  "decisions",
  "assets",
]);

function readActiveSection(): WorkspaceSectionId {
  if (typeof window === "undefined") return "overview";

  const section = window.location.hash.slice(1) as WorkspaceSectionId;
  return sectionIds.has(section) ? section : "overview";
}

export function WorkspaceLayout() {
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>(readActiveSection);

  useEffect(() => {
    const handleHashChange = () => setActiveSection(readActiveSection());

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="grid min-h-dvh min-[761px]:grid-cols-[4.75rem_minmax(0,1fr)] min-[1181px]:grid-cols-[15rem_minmax(0,1fr)] max-[760px]:block">
      <HomeSidebar activeSection={activeSection} />

      <div className="min-w-0">
        <div className="max-[760px]:hidden">
          <HomeNavbar workspace />
        </div>
        <div className="min-[761px]:hidden">
          <MobileNavigation activeSection={activeSection} />
        </div>

        <div className="mx-auto grid w-full max-w-[1480px] grid-cols-[minmax(0,1fr)_22rem] items-start gap-6 px-5 py-6 max-[1180px]:grid-cols-1 max-[760px]:gap-5 max-[760px]:px-4 max-[760px]:py-5 sm:px-6 min-[1181px]:px-8">
          <div className="grid min-w-0 gap-8">
            <section aria-labelledby="overview-title" className="scroll-mt-24" id="overview">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="font-mono text-[0.68rem] text-muted-foreground">
                    Northstar / Overview
                  </span>
                  <h1
                    className="mt-1.5 text-[clamp(1.65rem,3vw,2.4rem)] font-bold tracking-[-0.035em]"
                    id="overview-title"
                  >
                    Workspace signal
                  </h1>
                </div>
                <span className="font-mono text-[0.68rem] text-muted-foreground">
                  Updated 8 min ago
                </span>
              </div>
              <ChatShell />
            </section>

            <ActivitySection />
            <WorkspacePlaceholders />
          </div>

          <ProjectContext />
        </div>
      </div>
    </div>
  );
}
