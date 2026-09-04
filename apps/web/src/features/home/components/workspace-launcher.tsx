import { useTranslations } from "@voidmix/i18n/client";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useSession } from "../../../lib/auth-client";
import { createLocalChatSession } from "../../chat/local-chat-store";
import { Composer } from "../../chat/components/composer";
import type { ChatMessage } from "../../chat/types";
import { HomeNavbar } from "./home-navbar";
import { HomeSidebar } from "./sidebar";
import { MobileNavigation } from "./mobile-navigation";
import { WorkspacePlaceholders } from "./workspace-placeholder";
import { toggleSidebar, useSidebarOpen } from "../sidebar-store";
import type { WorkspaceSectionId } from "../data";

const launcherSections = new Set<WorkspaceSectionId>([
  "overview",
  "inbox",
  "projects",
  "reviews",
  "decisions",
  "assets",
]);

function readLauncherSection(): WorkspaceSectionId {
  if (typeof window === "undefined") return "overview";

  const section = window.location.hash.slice(1) as WorkspaceSectionId;
  return launcherSections.has(section) ? section : "overview";
}

function createInitialMessages(prompt: string, t: (key: string) => string): readonly ChatMessage[] {
  return [
    { id: "user-0", role: "user", content: prompt, timestamp: t("now") },
    {
      id: "assistant-0",
      role: "assistant",
      content: t("previewResponse"),
      timestamp: t("preview"),
    },
  ];
}

export function WorkspaceLauncher() {
  const t = useTranslations("home");
  const session = useSession();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>(readLauncherSection);
  const [draft, setDraft] = useState("");
  const [focusKey, setFocusKey] = useState(0);
  const sidebarOpen = useSidebarOpen();

  useEffect(() => {
    const handleHashChange = () => {
      const next = readLauncherSection();
      setActiveSection(next);
      const hashSection = window.location.hash.slice(1) as WorkspaceSectionId;
      if (!launcherSections.has(hashSection)) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (activeSection === "overview") return;

    const section = document.getElementById(activeSection);
    if (section && "scrollIntoView" in section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

  function focusComposer(prompt: string) {
    setDraft(prompt);
    setFocusKey((current) => current + 1);
    if (window.location.hash !== "#overview") {
      window.location.hash = "overview";
    }
  }

  function startChat(prompt: string) {
    if (session.isPending) return;

    const chatId = createLocalChatSession(createInitialMessages(prompt, t));
    const destination = `/chat/${chatId}`;

    if (!session.data) {
      void navigate({ to: "/login", search: { redirect: destination } });
      return;
    }

    void navigate({ to: "/chat/$chatId", params: { chatId } });
  }

  return (
    <div className="min-h-0 flex-1">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:ring-2 focus:ring-ring"
        href="#main-content"
      >
        {t("skipToContent")}
      </a>
      <HomeSidebar
        activeSection={activeSection}
        onNewTask={() => focusComposer("")}
        collapsed={!sidebarOpen}
        variant="launcher"
      />

      <div
        className={`min-w-0 transition-[padding] duration-200 ease-out motion-reduce:transition-none ${sidebarOpen ? "min-[761px]:pl-[15rem]" : "min-[761px]:pl-[4.5rem]"}`}
      >
        <div className="sticky top-0 z-30 max-[760px]:hidden">
          <HomeNavbar onSidebarToggle={toggleSidebar} sidebarOpen={sidebarOpen} workspace />
        </div>
        <div className="sticky top-0 z-20 min-[761px]:hidden">
          <MobileNavigation
            activeSection={activeSection}
            onNewTask={() => focusComposer("")}
            variant="launcher"
          />
        </div>

        <main
          className="mx-auto w-full max-w-[900px] px-5 pb-24 pt-[clamp(4.5rem,14vh,8.5rem)] max-[760px]:px-4 max-[760px]:pb-16 max-[760px]:pt-12 sm:px-8"
          id="main-content"
        >
          <section aria-labelledby="launcher-title" className="scroll-mt-24" id="overview">
            <div className="mx-auto max-w-[760px]">
              <div className="mb-7 text-center">
                <h1
                  className="mt-2 text-balance text-[clamp(1.9rem,4vw,2.75rem)] font-bold tracking-[-0.04em]"
                  id="launcher-title"
                >
                  {t("startTitle")}
                </h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {t("startDescription")}
                </p>
              </div>

              <Composer
                disabled={session.isPending}
                focusKey={focusKey}
                onSubmit={startChat}
                onValueChange={setDraft}
                value={draft}
                variant="launcher"
              />
            </div>

            {activeSection !== "overview" ? (
              <div className="mt-10">
                <WorkspacePlaceholders activeSection={activeSection} launcher />
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
