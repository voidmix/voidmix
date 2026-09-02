import { useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { useCallback, useEffect, useState } from "react";

import { ChatShell } from "../../chat/chat-shell";
import type { ChatMessage } from "../../chat/types";
import {
  readLocalChatSession,
  updateLocalChatSession,
  type LocalChatSession,
} from "../../chat/local-chat-store";
import { ActivitySection } from "./activity-section";
import { HomeFooter } from "./home-footer";
import { HomeNavbar } from "./home-navbar";
import { MobileNavigation } from "./mobile-navigation";
import { ProjectContext } from "./project-context";
import { HomeSidebar } from "./sidebar";
import { WorkspacePlaceholders } from "./workspace-placeholder";
import { type WorkspaceSectionId } from "../data";

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

export function ChatWorkspace({ chatId }: { chatId: string }) {
  const t = useTranslations("home");
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>(readActiveSection);
  const [localSession, setLocalSession] = useState<LocalChatSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    setLocalSession(readLocalChatSession(chatId));
    setSessionLoaded(true);
  }, [chatId]);

  const handleMessagesChange = useCallback(
    (messages: readonly ChatMessage[]) => updateLocalChatSession(chatId, messages),
    [chatId],
  );

  useEffect(() => {
    const handleHashChange = () => setActiveSection(readActiveSection());

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (!sessionLoaded) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-sm text-muted-foreground">
        {t("chatLoading")}
      </main>
    );
  }

  if (!localSession) {
    return (
      <main className="flex min-h-dvh flex-col bg-background">
        <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-5 py-16 text-center sm:px-8">
          <section aria-labelledby="missing-chat-title">
            <span className="font-mono text-[0.68rem] text-muted-foreground">Voidmix / Chat</span>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]" id="missing-chat-title">
              {t("chatUnavailableTitle")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("chatUnavailableDescription")}
            </p>
            <Button className="mt-6" onClick={() => void navigate({ to: "/" })}>
              {t("newTask")}
            </Button>
          </section>
        </div>
        <HomeFooter />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="min-h-dvh">
        <HomeSidebar
          activeSection={activeSection}
          onNewTask={() => void navigate({ to: "/" })}
          variant="workspace"
        />

        <div className="min-w-0 min-[761px]:pl-[4.75rem] min-[1181px]:pl-[15rem]">
          <div className="max-[760px]:hidden">
            <HomeNavbar workspace />
          </div>
          <div className="min-[761px]:hidden">
            <MobileNavigation
              activeSection={activeSection}
              onNewTask={() => void navigate({ to: "/" })}
              variant="workspace"
            />
          </div>

          <div className="mx-auto grid w-full max-w-[1480px] grid-cols-[minmax(0,1fr)_22rem] items-start gap-6 px-5 py-6 max-[1180px]:grid-cols-1 max-[760px]:gap-5 max-[760px]:px-4 max-[760px]:py-5 sm:px-6 min-[1181px]:px-8">
            <div className="grid min-w-0 gap-8">
              <section aria-labelledby="overview-title" className="scroll-mt-24" id="overview">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <span className="font-mono text-[0.68rem] text-muted-foreground">
                      {t("northstarWorkspace")} / Chat
                    </span>
                    <h1
                      className="mt-1.5 text-[clamp(1.65rem,3vw,2.4rem)] font-bold tracking-[-0.035em]"
                      id="overview-title"
                    >
                      {t("workspaceSignal")}
                    </h1>
                  </div>
                  <span className="font-mono text-[0.68rem] text-muted-foreground">
                    {t("previewLabel")}
                  </span>
                </div>
                <ChatShell
                  key={chatId}
                  initialMessages={localSession.messages}
                  onMessagesChange={handleMessagesChange}
                />
              </section>

              <ActivitySection />
              <WorkspacePlaceholders />
            </div>

            <ProjectContext />
          </div>
        </div>
      </div>
      <HomeFooter />
    </main>
  );
}
