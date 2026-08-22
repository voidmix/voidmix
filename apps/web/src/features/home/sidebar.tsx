import { ArrowRight, Bell, Gear, Plus, UsersThree } from "@phosphor-icons/react";
import { Avatar } from "@voidmix/ui/avatar";
import { Button } from "@voidmix/ui/components/ui/button";
import { Logo } from "@voidmix/ui/logo";

import { navigation, navigationClassName, navigationHref, recentThreads } from "./data";

export function HomeSidebar() {
  return (
    <aside aria-label="Workspace navigation" className="app-sidebar">
      <div className="sidebar-head">
        <a aria-label="Voidmix home" className="app-brand" href="/">
          <Logo />
        </a>
        <Button className="workspace-switcher" variant="ghost">
          <span className="workspace-switcher__mark">N</span>
          <span>
            <small>Workspace</small>
            Northstar
          </span>
          <ArrowRight aria-hidden="true" className="workspace-switcher__arrow" />
        </Button>
      </div>

      <Button className="new-task" size="lg" variant="primary">
        <Plus aria-hidden="true" weight="bold" />
        New task
      </Button>

      <nav className="workspace-nav">
        <p className="nav-label">Workspace</p>
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <a
              aria-current={item.current ? "page" : undefined}
              className={navigationClassName(item)}
              href={navigationHref(item)}
              key={item.label}
            >
              <Icon aria-hidden="true" weight={item.current ? "fill" : "regular"} />
              <span>{item.label}</span>
              {"count" in item && item.count ? <b>{item.count}</b> : null}
            </a>
          );
        })}
      </nav>

      <div className="recent-list">
        <p className="nav-label">Recent</p>
        {recentThreads.map((thread) => (
          <a href="#thread" key={thread}>
            <span className="recent-list__dot" />
            {thread}
          </a>
        ))}
      </div>

      <div className="sidebar-footer">
        <a className="workspace-nav__item" href="#team">
          <UsersThree aria-hidden="true" />
          <span>Team</span>
        </a>
        <a className="workspace-nav__item" href="#settings">
          <Gear aria-hidden="true" />
          <span>Settings</span>
        </a>
        <div className="sidebar-user">
          <Avatar name="Alex Morgan" size="small" />
          <span className="sidebar-user__identity">
            <strong>Alex Morgan</strong>
            <small>Admin</small>
          </span>
          <Bell aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
