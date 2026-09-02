import { ArrowRight, Stack } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { useEffect, useState } from "react";

import { useSession } from "../../../lib/auth-client";
import { createLocalChatSession } from "../../chat/local-chat-store";
import { Composer } from "../../chat/components/composer";
import type { ChatMessage } from "../../chat/types";
import { HomeNavbar } from "./home-navbar";
import { HomeSidebar } from "./sidebar";
import { MobileNavigation } from "./mobile-navigation";
import { launcherPrompts } from "../data";

const launcherSections = new Set(["overview", "projects"]);

function readLauncherSection(): "overview" | "projects" {
  if (typeof window === "undefined") return "overview";
  return window.location.hash.slice(1) === "projects" ? "projects" : "overview";
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
  const [activeSection, setActiveSection] = useState<"overview" | "projects">(readLauncherSection);
  const [draft, setDraft] = useState("");
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    const handleHashChange = () => {
      const next = readLauncherSection();
      setActiveSection(next);
      if (!launcherSections.has(window.location.hash.slice(1))) {
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
    <div className="grid min-h-dvh min-[761px]:grid-cols-[4.75rem_minmax(0,1fr)] min-[1181px]:grid-cols-[15rem_minmax(0,1fr)] max-[760px]:block">
      <HomeSidebar
        activeSection={activeSection}
        onNewTask={() => focusComposer("")}
        variant="launcher"
      />

      <div className="min-w-0">
        <div className="max-[760px]:hidden">
          <HomeNavbar workspace />
        </div>
        <div className="min-[761px]:hidden">
          <MobileNavigation
            activeSection={activeSection}
            onNewTask={() => focusComposer("")}
            variant="launcher"
          />
        </div>

        <main className="mx-auto w-full max-w-[900px] px-5 pb-24 pt-[clamp(4.5rem,14vh,8.5rem)] max-[760px]:px-4 max-[760px]:pb-16 max-[760px]:pt-12 sm:px-8">
          <section aria-labelledby="launcher-title" className="scroll-mt-24" id="overview">
            <div className="mx-auto max-w-[760px]">
              <div className="mb-7 text-center">
                <span className="font-mono text-[0.68rem] text-muted-foreground">
                  {t("northstarWorkspace")}
                </span>
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
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t("previewDataStays")}
              </p>

              <div className="mt-8 grid gap-x-8 gap-y-1 min-[561px]:grid-cols-2">
                {launcherPrompts.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      className="group flex min-h-10 items-center gap-2.5 rounded-md px-2 text-left text-[0.78rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      key={prompt.id}
                      onClick={() => focusComposer(t(prompt.messageKey))}
                      type="button"
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <span>{t(prompt.messageKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section
            aria-labelledby="launcher-projects-title"
            className="mt-24 scroll-mt-24 border-t border-border pt-6"
            id="projects"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="font-mono text-[0.68rem] text-muted-foreground">
                  {t("workspace")}
                </span>
                <h2
                  className="mt-1.5 text-xl font-semibold tracking-[-0.02em]"
                  id="launcher-projects-title"
                >
                  {t("launcherProjectsTitle")}
                </h2>
              </div>
              <span className="font-mono text-[0.68rem] text-muted-foreground">
                {t("previewLabel")}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                  <Stack aria-hidden="true" weight="bold" />
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{t("northstarLaunch")}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">{t("launcherProjectDetail")}</p>
                </div>
              </div>
              <Button
                className="shrink-0"
                onClick={() => focusComposer(t("launcherProjectPrompt"))}
                variant="ghost"
              >
                {t("launcherAskProject")}
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
