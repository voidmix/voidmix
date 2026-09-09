import {
  Bell,
  Command,
  FolderSimple,
  Gear,
  House,
  MagnifyingGlass,
  Pulse,
  Stack,
} from "@phosphor-icons/react";
import { Link, Outlet } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { Logo } from "@voidmix/ui/logo";
import { useEffect, useState } from "react";
import { getDesktopRuntime, hideMainWindow, type DesktopRuntime } from "../../lib/desktop";
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
      <Button className="icon-button" size="icon" variant="ghost" aria-label={t("notifications")}>
        <Bell size={16} weight="regular" />
        <span className="notification-dot" />
      </Button>
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
  const locale = useLocale();
  const setLocale = useSetLocale();
  const navigation = [
    { to: "/", label: t("home"), icon: House },
    { to: "/projects", label: t("projects"), icon: FolderSimple },
    { to: "/library", label: t("library"), icon: Stack },
    { to: "/activity", label: t("activity"), icon: Pulse },
    { to: "/settings", label: t("settings"), icon: Gear },
  ] as const;
  const [runtime, setRuntime] = useState<DesktopRuntime>({
    appVersion: "0.1.0",
    platform: "browser",
    trayEnabled: false,
  });

  useEffect(() => {
    void getDesktopRuntime().then(setRuntime);
  }, []);

  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo label="VoidMix" />
        </div>

        <nav className="primary-nav" aria-label={t("primaryNavigation")}>
          <p className="nav-label">{t("control")}</p>
          {navigation.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
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
          <Button className="search-trigger" variant="outline">
            <MagnifyingGlass size={15} weight="regular" />
            <span>{t("searchProjects")}</span>
            <kbd>
              <Command size={11} />K
            </kbd>
          </Button>
          <Button
            className="window-hide"
            variant="ghost"
            onClick={() => void setLocale(locale === "en" ? "zh" : "en").catch(() => undefined)}
            title={t("language")}
          >
            {t(locale === "en" ? "chinese" : "english")}
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
