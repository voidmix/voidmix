import {
  Bell,
  Files,
  FolderSimple,
  House,
  MagnifyingGlass,
  SidebarSimple,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@voidmix/ui/components/ui/dialog";
import { Logo } from "@voidmix/ui/logo";
import { cn } from "@voidmix/ui/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeSwitcher } from "../../../components/theme-switcher";
import { signOut, useSession } from "../../../lib/auth-client";
import { LoginButton } from "../../home/components/login-button";
import { UserDropdown } from "../../home/components/user-dropdown";
import type { ProjectTab, TaskFilter } from "../types";
import { useProjectStudioData } from "../studio-data";
import { studioInputClass, studioLabelClass, studioSearchRowClass } from "../studio-styles";
import { toggleProjectStudioShell, useProjectStudioShellCollapsed } from "../studio-shell-store";

export function ProjectStudioShell({
  children,
  current = "projects",
  projectSearch,
  title,
}: {
  children: ReactNode;
  current?: "home" | "projects" | "library";
  projectSearch?: { tab: ProjectTab; filter: TaskFilter };
  title?: string;
}) {
  const t = useTranslations("workspaceUi");
  const commonT = useTranslations("common");
  const { snapshot, state, retry } = useProjectStudioData();
  const session = useSession();
  const navigate = useNavigate();
  const collapsed = useProjectStudioShellCollapsed();
  const [panel, setPanel] = useState<"search" | "notifications" | "menu" | null>(null);
  const [query, setQuery] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const panelInvoker = useRef<HTMLElement | null>(null);
  const defaultProjectSearch = projectSearch ?? { tab: "overview", filter: "all" };
  const openPanel = (next: "search" | "notifications" | "menu") => {
    panelInvoker.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPanel(next);
  };
  const close = (restoreFocus = true) => {
    setPanel(null);
    if (!restoreFocus) return;
    queueMicrotask(() => {
      const invoker = panelInvoker.current;
      (invoker?.isConnected ? invoker : mainRef.current)?.focus();
    });
  };
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPanel("search");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  const matches = (value: string) =>
    value.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim());
  const projects = snapshot.projects.filter((project) => matches(project.name));
  const tasks = snapshot.tasks
    .filter((task) => (panel === "notifications" ? task.status === "blocked" : matches(task.title)))
    .slice(0, 10);
  const sessions = snapshot.sessions.filter((item) => matches(item.prompt)).slice(-5);
  const pages = (
    [
      { to: "/", label: t("home") },
      { to: "/projects", label: t("projects") },
      { to: "/library", label: t("library") },
    ] as const
  ).filter((page) => matches(page.label));
  const renderNav = (compact = false) => (
    <>
      <Link
        to="/"
        onClick={() => close(false)}
        className={cn(
          "flex min-h-[38px] items-center gap-[11px] rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none [&_svg]:size-[18px] [&_svg]:shrink-0",
          current === "home" && "bg-background text-foreground",
        )}
        aria-current={current === "home" ? "page" : undefined}
        title={t("home")}
      >
        <House aria-hidden="true" />
        <span className={compact ? "hidden" : undefined}>{t("home")}</span>
      </Link>
      <Link
        to="/library"
        onClick={() => close(false)}
        className={cn(
          "flex min-h-[38px] items-center gap-[11px] rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none [&_svg]:size-[18px] [&_svg]:shrink-0",
          current === "library" && "bg-background text-foreground",
        )}
        aria-current={current === "library" ? "page" : undefined}
        title={t("library")}
      >
        <Files aria-hidden="true" />
        <span className={compact ? "hidden" : undefined}>{t("library")}</span>
      </Link>
      <Link
        to="/projects"
        onClick={() => close(false)}
        className={cn(
          "flex min-h-[38px] items-center gap-[11px] rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none [&_svg]:size-[18px] [&_svg]:shrink-0",
          current === "projects" && "bg-background text-foreground",
        )}
        aria-current={current === "projects" ? "page" : undefined}
        title={t("projects")}
      >
        <FolderSimple aria-hidden="true" />
        <span className={compact ? "hidden" : undefined}>{t("projects")}</span>
      </Link>
    </>
  );
  return (
    <div className="min-h-dvh bg-[color-mix(in_oklch,var(--background)_94%,var(--muted))] text-foreground">
      <a href="#signal-main" className="fixed -top-25 left-5 z-[100] bg-background p-3 focus:top-3">
        {t("skip")}
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[35] flex flex-col overflow-y-auto border-r border-border bg-muted px-3.5 pt-[26px] pb-[22px] transition-[width] duration-150 motion-reduce:transition-none max-[800px]:hidden",
          collapsed ? "w-18" : "w-56 max-[1100px]:w-50",
        )}
        aria-label={commonT("primaryNavigation")}
      >
        <Link
          to="/"
          aria-label="Voidmix"
          className={cn("block w-fit px-3 text-[17px]", collapsed && "px-2")}
        >
          <Logo className={collapsed ? "[&>span]:hidden" : undefined} />
        </Link>
        <nav className="mt-8 grid gap-1" aria-label={commonT("primaryNavigation")}>
          {renderNav(collapsed)}
        </nav>
        <div className={cn("mt-9", collapsed && "hidden")}>
          <p className="mb-3 px-3 text-xs text-muted-foreground">{t("recent")}</p>
          {snapshot.projects
            .filter((project) => project.status !== "archived")
            .slice(0, 5)
            .map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                search={defaultProjectSearch}
                className="flex min-h-[38px] items-center gap-[11px] rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <span aria-hidden="true" className="text-muted-foreground">
                  ⌑
                </span>
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
        </div>
        <div className="mt-auto pt-8">
          <span className={cn("text-xs text-muted-foreground", collapsed && "hidden")}>
            {t("preview")}
          </span>
        </div>
      </aside>
      <div
        className={cn(
          "flex min-h-dvh min-w-0 flex-col transition-[margin] duration-150 motion-reduce:transition-none max-[800px]:ml-0",
          collapsed ? "ml-18" : "ml-56 max-[1100px]:ml-50",
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background px-6 max-[800px]:px-3.5">
          <Button
            className="max-[800px]:hidden"
            size="icon"
            variant="ghost"
            onClick={toggleProjectStudioShell}
            aria-label={t(collapsed ? "expand" : "collapse")}
            aria-expanded={!collapsed}
          >
            <SidebarSimple aria-hidden="true" />
          </Button>
          <Button
            className="hidden max-[800px]:inline-flex"
            size="icon"
            variant="ghost"
            onClick={() => openPanel("menu")}
            aria-label={t("menu")}
          >
            <SidebarSimple aria-hidden="true" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted-foreground">Voidmix</span>
            {title ? <span className="max-[520px]:hidden"> / {title}</span> : null}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("search")}
            onClick={() => openPanel("search")}
          >
            <MagnifyingGlass aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("notifications")}
            onClick={() => openPanel("notifications")}
          >
            <Bell aria-hidden="true" />
          </Button>
          <div className="flex items-center gap-1 max-[800px]:hidden">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
          {session.data?.user ? (
            <UserDropdown
              user={session.data.user}
              compact
              onSignOut={async () => {
                await signOut();
                await navigate({ to: "/" });
              }}
            />
          ) : (
            <div className="w-9">
              <LoginButton compact />
            </div>
          )}
        </header>
        <main
          ref={mainRef}
          id="signal-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1060px] flex-1 px-[clamp(20px,4vw,56px)] pt-[42px] pb-15 outline-none max-[800px]:px-6 max-[800px]:pt-8 max-[800px]:pb-12 max-[520px]:px-5"
        >
          {state === "error" ? (
            <div role="alert" className="grid gap-4 py-12">
              <h1 className="text-xl font-medium">{t("loadError")}</h1>
              <p className="text-sm text-muted-foreground">{t("loadErrorDetail")}</p>
              <Button className="w-fit" onClick={retry}>
                {t("retry")}
              </Button>
            </div>
          ) : (
            <div className="grid">
              {/* Keep the page's intrinsic size while restoring tab-local data. */}
              <div
                className={cn(
                  "col-start-1 row-start-1 min-w-0",
                  state === "loading" && "invisible",
                )}
                inert={state === "loading"}
                aria-hidden={state === "loading"}
              >
                {children}
              </div>
              {state === "loading" ? (
                <div
                  role="status"
                  aria-label={t("loading")}
                  className="col-start-1 row-start-1 grid self-start gap-6 py-12"
                >
                  <div className="h-9 w-1/2 rounded-md bg-muted" />
                  <div className="h-32 rounded-lg bg-muted" />
                  <p className="text-sm text-muted-foreground">{t("loading")}</p>
                </div>
              ) : null}
            </div>
          )}
        </main>
        <footer className="flex flex-wrap justify-between gap-2.5 px-7 py-[18px] text-[11px] text-muted-foreground max-[520px]:px-5">
          <span>{t("preview")}</span>
          <span>{t("sessionOnly")}</span>
        </footer>
      </div>
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="max-h-[80dvh] overflow-y-auto" showCloseButton={false}>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>
              {t(
                panel === "notifications"
                  ? "notifications"
                  : panel === "menu"
                    ? "workspace"
                    : "search",
              )}
            </DialogTitle>
            <Button variant="ghost" onClick={() => close()}>
              {t("close")}
            </Button>
          </div>
          <DialogDescription>{t("previewNote")}</DialogDescription>
          {panel === "menu" ? (
            <>
              <nav className="grid gap-2">{renderNav()}</nav>
              <div className="flex gap-2">
                <LanguageSwitcher />
                <ThemeSwitcher />
              </div>
            </>
          ) : (
            <>
              {panel === "search" ? (
                <input
                  className={studioInputClass}
                  aria-label={t("search")}
                  placeholder={t("searchHint")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                />
              ) : null}
              {panel === "search" ? (
                <>
                  <h3 className={studioLabelClass}>{t("projects")}</h3>
                  {projects.map((project) => (
                    <Link
                      onClick={() => close(false)}
                      key={project.id}
                      to="/projects/$projectId"
                      params={{ projectId: project.id }}
                      search={{ tab: "overview", filter: "all" }}
                      className={studioSearchRowClass}
                    >
                      {project.name}
                    </Link>
                  ))}
                </>
              ) : null}
              <h3 className={studioLabelClass}>{t("tasks")}</h3>
              {tasks.map((task) => (
                <Link
                  onClick={() => close(false)}
                  key={task.id}
                  to="/projects/$projectId"
                  params={{ projectId: task.projectId }}
                  search={{ tab: "tasks", filter: "all" }}
                  className={studioSearchRowClass}
                >
                  {task.title}
                </Link>
              ))}
              {panel === "search" ? (
                <>
                  <h3 className={studioLabelClass}>{t("sessionSearch")}</h3>
                  {sessions.map((item) => (
                    <Link
                      onClick={() => close(false)}
                      key={item.id}
                      to="/projects/$projectId/pi/$sessionId"
                      params={{ projectId: item.projectId, sessionId: item.id }}
                      className={studioSearchRowClass}
                    >
                      {item.prompt}
                    </Link>
                  ))}
                  <h3 className={studioLabelClass}>{t("pageSearch")}</h3>
                  {pages.map((page) => (
                    <Link
                      key={page.to}
                      to={page.to}
                      onClick={() => close(false)}
                      className={studioSearchRowClass}
                    >
                      {page.label}
                    </Link>
                  ))}
                </>
              ) : null}
              {(panel === "notifications" && !tasks.length) ||
              (panel === "search" &&
                !projects.length &&
                !tasks.length &&
                !sessions.length &&
                !pages.length) ? (
                <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
