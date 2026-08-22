import {
  Bell,
  Cloud,
  Command,
  DotsThree,
  Gear,
  Laptop,
  MagnifyingGlass,
  Pulse,
} from "@phosphor-icons/react";
import { Link, Outlet } from "@tanstack/react-router";
import { Avatar } from "@voidmix/ui/avatar";
import { Button } from "@voidmix/ui/components/ui/button";
import { Logo } from "@voidmix/ui/logo";
import { useEffect, useState } from "react";
import { getDesktopRuntime, hideMainWindow, type DesktopRuntime } from "../../lib/desktop";
import "@voidmix/ui/styles.css";
import "../../App.css";

const navigation = [
  { to: "/", label: "Overview", icon: Cloud },
  { to: "/activity", label: "Activity", icon: Pulse },
  { to: "/devices", label: "Devices", icon: Laptop },
  { to: "/settings", label: "Settings", icon: Gear },
] as const;

function WindowActions() {
  const [message, setMessage] = useState("");

  async function handleHide() {
    const hidden = await hideMainWindow();
    if (!hidden) {
      setMessage("Tray controls are available in the desktop build.");
      window.setTimeout(() => setMessage(""), 2800);
    }
  }

  return (
    <div className="window-actions">
      {message ? <span className="window-message">{message}</span> : null}
      <Button className="icon-button" size="icon" variant="ghost" aria-label="Notifications">
        <Bell size={16} weight="regular" />
        <span className="notification-dot" />
      </Button>
      <Button
        className="window-hide"
        variant="ghost"
        onClick={() => void handleHide()}
        title="Hide Voidmix to the system tray"
      >
        Hide to tray
      </Button>
    </div>
  );
}

export function DesktopShell() {
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
          <Logo />
          <span className="edition">Field</span>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Control</p>
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
        <div className="workspace-switcher">
          <Avatar name="Acme Studio" size="small" />
          <span>
            <strong>Acme Studio</strong>
            <small>Team workspace</small>
          </span>
          <DotsThree size={16} aria-hidden="true" weight="regular" />
        </div>
        <div className="runtime-status">
          <span className={runtime.trayEnabled ? "runtime-dot ready" : "runtime-dot"} />
          <span>
            <strong>{runtime.trayEnabled ? "Desktop shell ready" : "Browser preview"}</strong>
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
            <span>Search workspace</span>
            <kbd>
              <Command size={11} />K
            </kbd>
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
