import { FolderSimple, Gear, House, SidebarSimple, Pulse } from "@phosphor-icons/react";
import { LOCALE_OPTIONS } from "@voidmix/i18n";
import { Link, Outlet } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { Logo } from "@voidmix/ui/logo";
import { useEffect, useState } from "react";
import { getDesktopRuntime, hideMainWindow, type DesktopRuntime } from "../../lib/desktop";
import { useDesktopPreferences } from "../../lib/preferences";
import { AccountControl } from "./account-control";
import { useDesktopTranslations, useLocale, useSetLocale } from "../../i18n/client";

function WindowActions() {
  const t = useDesktopTranslations("common");
  const [message, setMessage] = useState("");

  async function handleHide() {
    const hidden = await hideMainWindow();
    if (!hidden) {
      setMessage(t("trayMessage"));
      window.setTimeout(() => setMessage(""), 2800);
    }
  }

  return (
    <div className="window-actions">
      {message ? <span className="window-message">{message}</span> : null}
      <Button
        className="window-hide"
        variant="ghost"
        onClick={() => void handleHide()}
        title={t("hideToTray")}
      >
        {t("hideToTray")}
      </Button>
    </div>
  );
}

export function DesktopShell() {
  const t = useDesktopTranslations("common");
  const themeT = useDesktopTranslations("settings");
  const locale = useLocale();
  const setLocale = useSetLocale();
  const navigation = [
    { to: "/", label: t("home"), icon: House },
    { to: "/projects", label: t("projects"), icon: FolderSimple },
    { to: "/activity", label: t("activity"), icon: Pulse },
    { to: "/settings", label: t("settings"), icon: Gear },
  ] as const;
  const theme = useDesktopPreferences((state) => state.theme);
  const toggleTheme = useDesktopPreferences((state) => state.toggleTheme);
  const [collapsed, setCollapsed] = useState(false);
  const [runtime, setRuntime] = useState<DesktopRuntime>({
    appVersion: "0.1.0",
    platform: "browser",
    trayEnabled: false,
  });

  useEffect(() => {
    void useDesktopPreferences.persist.rehydrate();
    void getDesktopRuntime().then(setRuntime);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <div className="desktop-shell" data-collapsed={collapsed || undefined}>
      <aside className="sidebar">
        <Link to="/projects" className="brand" aria-label={t("projects")}>
          <Logo label="VoidMix" />
        </Link>

        <nav className="primary-nav" aria-label={t("primaryNavigation")}>
          <p className="nav-label">{t("control")}</p>
          {navigation.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              title={label}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "nav-link active" }}
              inactiveProps={{ className: "nav-link" }}
            >
              <Icon size={16} weight="regular" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <AccountControl />
        <div className="runtime-status">
          <span className={runtime.trayEnabled ? "runtime-dot ready" : "runtime-dot"} />
          <span>
            <strong>{runtime.trayEnabled ? t("desktopReady") : t("browserPreview")}</strong>
            <small>
              v{runtime.appVersion} · {runtime.platform}
            </small>
          </span>
        </div>
      </aside>

      <div className="app-frame">
        <header className="titlebar" data-tauri-drag-region>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t(collapsed ? "expandNavigation" : "collapseNavigation")}
            aria-pressed={collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <SidebarSimple aria-hidden="true" />
          </Button>
          <span className="titlebar-context">{t("control")}</span>
          <Button
            className="window-hide"
            variant="ghost"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? themeT("lightTheme") : themeT("darkTheme")}
            title={theme === "dark" ? themeT("lightTheme") : themeT("darkTheme")}
          >
            {theme === "dark" ? "☼" : "◐"}
          </Button>
          <Button
            className="window-hide"
            variant="ghost"
            onClick={() => void setLocale(locale === "en" ? "zh" : "en").catch(() => undefined)}
            title={t("language")}
          >
            {LOCALE_OPTIONS.find((option) => option.value !== locale)?.nativeName}
          </Button>
          <WindowActions />
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
