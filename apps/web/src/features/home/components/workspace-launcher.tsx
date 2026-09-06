import { useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { useSession } from "../../../lib/auth-client";
import { useCallback, useEffect, useState } from "react";
import { createLocalChatSession } from "../../chat/local-chat-store";
import type { ChatMessage } from "../../chat/types";
import { HomeNavbar } from "./home-navbar";
import { HomeSidebar } from "./sidebar";
import { MobileNavigation } from "./mobile-navigation";
import { HomeCommandCenter } from "./home-command-center";
import { TodayWorkList } from "./today-work-list";
import { WorkspacePlaceholders } from "./workspace-placeholder";
import { DemoOverlay, type DemoOverlayState } from "./demo-overlay";
import { signals, signalCounts, type SignalItem, type WorkspaceSectionId } from "../data";
import { toggleSidebar, useSidebarOpen } from "../sidebar-store";

const sectionIds = new Set<WorkspaceSectionId>([
  "overview",
  "inbox",
  "projects",
  "reviews",
  "decisions",
  "assets",
]);
function readSection(): WorkspaceSectionId {
  if (typeof window === "undefined") return "overview";
  const value = window.location.hash.slice(1) as WorkspaceSectionId;
  return sectionIds.has(value) ? value : "overview";
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
  const sidebarOpen = useSidebarOpen();
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>(readSection);
  const [draft, setDraft] = useState("");
  const [focusKey, setFocusKey] = useState(0);
  const [overlay, setOverlay] = useState<DemoOverlayState>(null);
  const [items, setItems] = useState(signals);
  useEffect(() => {
    const handle = () => setActiveSection(readSection());
    handle();
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, []);
  useEffect(() => {
    if (activeSection === "overview") return;
    document
      .getElementById(activeSection)
      ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [activeSection]);
  const focusComposer = useCallback((prompt: string) => {
    setDraft(prompt);
    setFocusKey((value) => value + 1);
    window.location.hash = "overview";
  }, []);
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
  const counts = signalCounts(items);
  function handleSubmit(prompt: string) {
    const task: SignalItem = {
      id: `task-${Date.now()}`,
      titleKey: "taskCreated",
      detailKey: "taskResultDescription",
      priority: 0,
      status: "pending",
      owner: "You",
      timestamp: 0,
      action: "open",
      relatedSection: "inbox",
    };
    setItems((current) => [task, ...current]);
    startChat(prompt);
  }
  return (
    <div className="min-h-0 flex-1">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
        href="#main-content"
      >
        {t("skipToContent")}
      </a>
      <HomeSidebar
        activeSection={activeSection}
        counts={counts}
        onNewTask={() => focusComposer("")}
        onOpenOverlay={setOverlay}
        collapsed={!sidebarOpen}
        variant="launcher"
      />
      <div
        className={`min-w-0 transition-[padding] duration-200 ease-out motion-reduce:transition-none ${sidebarOpen ? "min-[761px]:pl-[15rem]" : "min-[761px]:pl-[4.5rem]"}`}
      >
        <div className="sticky top-0 z-30 max-[760px]:hidden">
          <HomeNavbar
            onSidebarToggle={toggleSidebar}
            onOpenOverlay={setOverlay}
            sidebarOpen={sidebarOpen}
            workspace
          />
        </div>
        <div className="sticky top-0 z-20 min-[761px]:hidden">
          <MobileNavigation
            activeSection={activeSection}
            onNewTask={() => focusComposer("")}
            onOpenOverlay={setOverlay}
            variant="launcher"
          />
        </div>
        <main
          className="mx-auto w-full max-w-[860px] px-5 pb-24 pt-[clamp(4rem,13vh,8rem)] max-[760px]:px-4 max-[760px]:pt-12 sm:px-8"
          id="main-content"
        >
          <div className="grid min-w-0 gap-10">
            <HomeCommandCenter
              disabled={session.isPending}
              draft={draft}
              focusKey={focusKey}
              onDraftChange={setDraft}
              onNewTask={() => focusComposer("")}
              onSubmit={handleSubmit}
            />
            <TodayWorkList
              items={items}
              onCompleteItem={(item) =>
                setItems((current) =>
                  current.map((candidate) =>
                    candidate.id === item.id ? { ...candidate, status: "complete" } : candidate,
                  ),
                )
              }
              onOpenItem={(item) => setOverlay({ kind: "item", item })}
            />
            {activeSection !== "overview" ? (
              <WorkspacePlaceholders activeSection={activeSection} launcher />
            ) : null}
          </div>
        </main>
      </div>
      <DemoOverlay
        state={overlay}
        onClose={() => setOverlay(null)}
        onComplete={(item) =>
          setItems((current) =>
            current.map((candidate) =>
              candidate.id === item.id ? { ...candidate, status: "complete" } : candidate,
            ),
          )
        }
      />
    </div>
  );
}
