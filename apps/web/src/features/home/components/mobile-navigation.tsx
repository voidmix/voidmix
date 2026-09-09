import {
  House,
  List,
  Plus,
  FolderSimple,
  ChatCircleDots,
  UsersThree,
  Gear,
  X,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslations } from "../../../i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { useState } from "react";
import { navigation, type WorkspaceSectionId } from "../data";
import type { DemoOverlayState } from "./demo-overlay";
import { UserDropdown } from "./user-dropdown";
import { useSession, signOut } from "../../../lib/auth-client";
import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeSwitcher } from "../../../components/theme-switcher";
import { Logo } from "@voidmix/ui/logo";

export function MobileNavigation({
  activeSection = "overview",
  onNewTask,
  onOpenOverlay: _onOpenOverlay,
  variant: _variant = "workspace",
}: {
  activeSection?: WorkspaceSectionId;
  onNewTask?: () => void;
  onOpenOverlay?: (state: Exclude<DemoOverlayState, null>) => void;
  variant?: "launcher" | "workspace";
}) {
  const t = useTranslations("home");
  const commonT = useTranslations("common");
  const navigate = useNavigate();
  const session = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const extras = [navigation[3], navigation[4], navigation[5]];
  const handleNewTask = onNewTask ?? (() => void navigate({ to: "/" }));
  const user = session.data?.user;
  const role = (user as { role?: string | null } | undefined)?.role;
  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/" });
  }
  function select(id: WorkspaceSectionId) {
    setMoreOpen(false);
    window.location.hash = id;
  }
  return (
    <>
      <header className="home-mobile-navigation sticky top-0 z-30 grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/95 px-4 py-2 supports-backdrop-filter:backdrop-blur-sm">
        <a aria-label={commonT("brand")} className="inline-flex text-foreground" href="/">
          <Logo className="text-base" />
        </a>
        <button className="min-w-0 text-left">
          <span className="block truncate text-[0.68rem] text-muted-foreground">
            {t("workspace")}
          </span>
          <strong className="block truncate text-xs">{t("northstarWorkspace")}</strong>
        </button>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {user ? (
            <UserDropdown
              onNewTask={handleNewTask}
              onSignOut={handleSignOut}
              user={{ email: user.email, name: user.name, ...(role !== undefined ? { role } : {}) }}
            />
          ) : null}
          <Button
            aria-label={t("moreNavigation")}
            onClick={() => setMoreOpen(true)}
            size="icon"
            variant="ghost"
          >
            <List weight="bold" />
          </Button>
        </div>
      </header>
      <nav
        aria-label={t("workspace")}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 supports-backdrop-filter:backdrop-blur-sm"
      >
        <MobileNavButton
          icon={House}
          label={t("navOverview")}
          active={activeSection === "overview"}
          onClick={() => select("overview")}
        />
        <MobileNavButton
          icon={ChatCircleDots}
          label={t("navInbox")}
          active={activeSection === "inbox"}
          onClick={() => select("inbox")}
        />
        <Button
          aria-label={t("newTask")}
          className="mx-auto -mt-5 size-12 rounded-full border-4 border-background shadow-lg"
          onClick={handleNewTask}
          size="icon-lg"
          variant="primary"
        >
          <Plus weight="bold" />
        </Button>
        <MobileNavButton
          icon={FolderSimple}
          label={t("navProjects")}
          active={activeSection === "projects"}
          onClick={() => select("projects")}
        />
        <MobileNavButton
          icon={List}
          label={t("moreNavigation")}
          active={moreOpen}
          onClick={() => setMoreOpen(true)}
        />
      </nav>
      {moreOpen ? (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setMoreOpen(false)}>
          <section
            aria-label={t("moreNavigation")}
            className="absolute inset-x-0 bottom-0 rounded-t-xl border-t border-border bg-background p-5 pb-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("moreNavigation")}</h2>
              <Button
                aria-label={t("closePanel")}
                onClick={() => setMoreOpen(false)}
                size="icon"
                variant="ghost"
              >
                <X />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {extras.map((item) => (
                <button
                  className="grid min-h-20 place-items-center gap-2 rounded-md border border-border p-2 text-center text-xs hover:bg-muted"
                  key={item.id}
                  onClick={() => select(item.id)}
                >
                  <item.icon className="text-lg" />
                  {t(item.messageKey)}
                </button>
              ))}
              <button
                className="grid min-h-20 place-items-center gap-2 rounded-md border border-border p-2 text-center text-xs hover:bg-muted"
                onClick={() => {
                  setMoreOpen(false);
                  window.location.hash = "team";
                }}
              >
                <UsersThree className="text-lg" />
                {t("team")}
              </button>
              <button
                className="grid min-h-20 place-items-center gap-2 rounded-md border border-border p-2 text-center text-xs hover:bg-muted"
                onClick={() => {
                  setMoreOpen(false);
                  window.location.hash = "settings";
                }}
              >
                <Gear className="text-lg" />
                {t("settings")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
function MobileNavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof House;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`grid min-h-11 place-items-center gap-0.5 rounded-md px-1 text-[0.62rem] ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
      onClick={onClick}
    >
      <Icon weight={active ? "fill" : "regular"} />
      <span>{label}</span>
    </button>
  );
}
