import { useEffect, useState } from "react";
import { useTranslations } from "@voidmix/i18n/client";
import { cn } from "@voidmix/ui/lib/utils";

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
  const t = useTranslations("home");
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>(readActiveSection);
  const [chatStarted, setChatStarted] = useState(false);
  const isPreChat = !chatStarted && activeSection === "overview";

  useEffect(() => {
    const handleHashChange = () => setActiveSection(readActiveSection());

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="grid min-h-dvh min-[761px]:grid-cols-[4.75rem_minmax(0,1fr)] min-[1181px]:grid-cols-[15rem_minmax(0,1fr)] max-[760px]:block">
      <HomeSidebar activeSection={activeSection} minimal={isPreChat} />

      <div className="min-w-0">
        <div className="max-[760px]:hidden">
          <HomeNavbar workspace />
        </div>
        <div className="min-[761px]:hidden">
          <MobileNavigation activeSection={activeSection} minimal={isPreChat} />
        </div>

        <div
          className={cn(
            "mx-auto w-full items-start",
            chatStarted
              ? "grid max-w-[1480px] grid-cols-[minmax(0,1fr)_22rem] gap-6 px-5 py-6 max-[1180px]:grid-cols-1 max-[760px]:gap-5 max-[760px]:px-4 max-[760px]:py-5 sm:px-6 min-[1181px]:px-8"
              : "max-w-[760px] px-5 py-6 max-[760px]:gap-5 max-[760px]:px-4 max-[760px]:py-5 sm:px-6",
          )}
        >
          <div className="grid min-w-0 gap-8">
            <section
              aria-labelledby="overview-title"
              className={cn(
                "scroll-mt-24",
                isPreChat && "flex min-h-[calc(100dvh-5rem)] flex-col justify-center",
              )}
              id="overview"
            >
              {isPreChat ? (
                <div className="mb-5 text-center">
                  <span className="font-mono text-[0.68rem] text-muted-foreground">
                    {t("northstarWorkspace")}
                  </span>
                  <h1
                    className="mt-2 text-[clamp(1.8rem,4vw,2.65rem)] font-bold tracking-[-0.04em]"
                    id="overview-title"
                  >
                    {t("startTitle")}
                  </h1>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    {t("startDescription")}
                  </p>
                </div>
              ) : (
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
              )}
              <ChatShell onStarted={() => setChatStarted(true)} />
            </section>

            {!isPreChat ? <ActivitySection /> : null}
            {!isPreChat ? <WorkspacePlaceholders /> : null}
          </div>

          {chatStarted ? <ProjectContext /> : null}
        </div>
      </div>
    </div>
  );
}
