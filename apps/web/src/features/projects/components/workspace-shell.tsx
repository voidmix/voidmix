import { Bell, FolderSimple, House, MagnifyingGlass, SidebarSimple } from "@phosphor-icons/react";
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
import { useEffect, useState, type ReactNode } from "react";
import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeSwitcher } from "../../../components/theme-switcher";
import { signOut, useSession } from "../../../lib/auth-client";
import { LoginButton } from "../../home/components/login-button";
import { UserDropdown } from "../../home/components/user-dropdown";
import { useWorkspaceData } from "../workspace-data";

export function WorkspaceShell({
  children,
  current = "projects",
  title,
}: {
  children: ReactNode;
  current?: "home" | "projects";
  title?: string;
}) {
  const t = useTranslations("workspaceUi");
  const { snapshot, state, retry } = useWorkspaceData();
  const session = useSession();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState<"search" | "notifications" | "menu" | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPanel("search");
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
    ] as const
  ).filter((page) => matches(page.label));
  const close = () => setPanel(null);
  const nav = (
    <>
      <Link
        to="/"
        onClick={close}
        className={`signal-nav-link ${current === "home" ? "is-current" : ""}`}
        aria-current={current === "home" ? "page" : undefined}
        title={t("home")}
      >
        <House aria-hidden="true" />
        <span>{t("home")}</span>
      </Link>
      <Link
        to="/projects"
        onClick={close}
        className={`signal-nav-link ${current === "projects" ? "is-current" : ""}`}
        aria-current={current === "projects" ? "page" : undefined}
        title={t("projects")}
      >
        <FolderSimple aria-hidden="true" />
        <span>{t("projects")}</span>
      </Link>
    </>
  );
  return (
    <div className={`signal-workspace ${collapsed ? "signal-collapsed" : ""}`}>
      <a href="#signal-main" className="signal-skip">
        {t("skip")}
      </a>
      <aside className="signal-sidebar" aria-label={t("workspace")}>
        <Link to="/" aria-label="Voidmix" className="signal-brand">
          <Logo />
        </Link>
        <nav className="mt-8 grid gap-1" aria-label={t("workspace")}>
          {nav}
        </nav>
        <div className="signal-recents mt-9">
          <p className="mb-3 px-3 text-xs text-muted-foreground">{t("recent")}</p>
          {snapshot.projects
            .filter((project) => project.status !== "archived")
            .slice(0, 5)
            .map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                search={{ tab: "overview", filter: "all" }}
                className="signal-nav-link"
              >
                <span aria-hidden="true" className="text-muted-foreground">
                  ⌑
                </span>
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
        </div>
        <div className="mt-auto pt-8">
          <span className="signal-preview-label text-xs text-muted-foreground">{t("preview")}</span>
        </div>
      </aside>
      <div className="signal-body">
        <header className="signal-topbar">
          <Button
            className="signal-desktop-toggle"
            size="icon"
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={t(collapsed ? "expand" : "collapse")}
            aria-expanded={!collapsed}
          >
            <SidebarSimple aria-hidden="true" />
          </Button>
          <Button
            className="signal-mobile-toggle"
            size="icon"
            variant="ghost"
            onClick={() => setPanel("menu")}
            aria-label={t("menu")}
          >
            <SidebarSimple aria-hidden="true" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted-foreground">{t("workspace")}</span>
            {title ? <span className="signal-breadcrumb"> / {title}</span> : null}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("search")}
            onClick={() => setPanel("search")}
          >
            <MagnifyingGlass aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("notifications")}
            onClick={() => setPanel("notifications")}
          >
            <Bell aria-hidden="true" />
          </Button>
          <div className="signal-utilities">
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
        <main id="signal-main" className="signal-main">
          {state === "loading" ? (
            <div role="status" aria-label={t("loading")} className="grid gap-6 py-12">
              <div className="h-9 w-1/2 rounded-md bg-muted" />
              <div className="h-32 rounded-lg bg-muted" />
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            </div>
          ) : state === "error" ? (
            <div role="alert" className="grid gap-4 py-12">
              <h1 className="text-xl font-medium">{t("loadError")}</h1>
              <p className="text-sm text-muted-foreground">{t("loadErrorDetail")}</p>
              <Button className="w-fit" onClick={retry}>
                {t("retry")}
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
        <footer className="signal-footer">
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
            <Button variant="ghost" onClick={close}>
              {t("close")}
            </Button>
          </div>
          <DialogDescription>{t("previewNote")}</DialogDescription>
          {panel === "menu" ? (
            <>
              <nav className="grid gap-2">{nav}</nav>
              <div className="flex gap-2">
                <LanguageSwitcher />
                <ThemeSwitcher />
              </div>
            </>
          ) : (
            <>
              {panel === "search" ? (
                <input
                  className="signal-input"
                  aria-label={t("search")}
                  placeholder={t("searchHint")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                />
              ) : null}
              {panel === "search" ? (
                <>
                  <h3 className="signal-label">{t("projects")}</h3>
                  {projects.map((project) => (
                    <Link
                      onClick={close}
                      key={project.id}
                      to="/projects/$projectId"
                      params={{ projectId: project.id }}
                      search={{ tab: "overview", filter: "all" }}
                      className="signal-search-row"
                    >
                      {project.name}
                    </Link>
                  ))}
                </>
              ) : null}
              <h3 className="signal-label">{t("tasks")}</h3>
              {tasks.map((task) => (
                <Link
                  onClick={close}
                  key={task.id}
                  to="/projects/$projectId"
                  params={{ projectId: task.projectId }}
                  search={{ tab: "tasks", filter: "all" }}
                  className="signal-search-row"
                >
                  {task.title}
                </Link>
              ))}
              {panel === "search" ? (
                <>
                  <h3 className="signal-label">{t("sessionSearch")}</h3>
                  {sessions.map((item) => (
                    <Link
                      onClick={close}
                      key={item.id}
                      to="/projects/$projectId/pi/$sessionId"
                      params={{ projectId: item.projectId, sessionId: item.id }}
                      className="signal-search-row"
                    >
                      {item.prompt}
                    </Link>
                  ))}
                  <h3 className="signal-label">{t("pageSearch")}</h3>
                  {pages.map((page) => (
                    <Link key={page.to} to={page.to} onClick={close} className="signal-search-row">
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
