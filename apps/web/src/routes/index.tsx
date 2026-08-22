import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle,
  ChatCircleDots,
  FileText,
  FolderSimple,
  Gear,
  House,
  Lightning,
  MagnifyingGlass,
  Plus,
  Pulse,
  Stack,
  UsersThree,
} from "@phosphor-icons/react";
import { Avatar, Badge, BrandMark, Button } from "@voidmix/ui";

export const Route = createFileRoute("/")({ component: Home });

const navigation = [
  { label: "Overview", icon: House, current: true, count: undefined },
  { label: "Inbox", icon: ChatCircleDots, current: false, count: 4 },
  { label: "Projects", icon: FolderSimple, current: false, count: undefined },
  { label: "Reviews", icon: CheckCircle, current: false, count: 3 },
  { label: "Decisions", icon: Lightning, current: false, count: undefined },
  { label: "Assets", icon: Stack, current: false, count: undefined },
] as const;

const recentThreads = ["Final cut / v18", "Launch film delivery", "Q3 campaign brief"] as const;

const activity = [
  {
    title: "Approve final color pass",
    detail: "3 reviewers ready · delivery blocked",
    state: "Needs decision",
    tone: "warning",
  },
  {
    title: "Sound mix arriving",
    detail: "Mina is tracking the handoff",
    state: "In progress",
    tone: "live",
  },
  {
    title: "Picture lock confirmed",
    detail: "Leo closed the review thread",
    state: "Complete",
    tone: "complete",
  },
] as const;

const operators = [
  { name: "Mina Cole", role: "Creative lead" },
  { name: "Leo Wang", role: "Editor" },
  { name: "Samira Bell", role: "Producer" },
] as const;

function Home() {
  return (
    <main className="app-shell">
      <aside aria-label="Workspace navigation" className="app-sidebar">
        <div className="sidebar-head">
          <a aria-label="Voidmix home" className="app-brand" href="/">
            <BrandMark />
          </a>
          <button className="workspace-switcher" type="button">
            <span className="workspace-switcher__mark">N</span>
            <span>
              <small>Workspace</small>
              Northstar
            </span>
            <ArrowRight aria-hidden="true" className="workspace-switcher__arrow" />
          </button>
        </div>

        <button className="new-task" type="button">
          <Plus aria-hidden="true" weight="bold" />
          New task
        </button>

        <nav className="workspace-nav">
          <p className="nav-label">Workspace</p>
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <a
                aria-current={item.current ? "page" : undefined}
                className={`workspace-nav__item${item.current ? " is-current" : ""}`}
                href={item.current ? "#overview" : `#${item.label.toLowerCase()}`}
                key={item.label}
              >
                <Icon aria-hidden="true" weight={item.current ? "fill" : "regular"} />
                <span>{item.label}</span>
                {item.count ? <b>{item.count}</b> : null}
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

      <section className="app-main" id="overview">
        <header className="app-topbar">
          <div className="topbar-location">
            <span>Northstar</span>
            <span aria-hidden="true">/</span>
            <strong>Overview</strong>
          </div>
          <div className="topbar-actions">
            <button aria-label="Search workspace" type="button">
              <MagnifyingGlass aria-hidden="true" />
            </button>
            <button aria-label="Open notifications" type="button">
              <Bell aria-hidden="true" />
            </button>
            <Button variant="secondary">
              Open workspace <ArrowUpRight aria-hidden="true" weight="bold" />
            </Button>
          </div>
        </header>

        <div className="main-column">
          <section aria-labelledby="welcome-title" className="welcome-block">
            <div className="live-kicker">
              <span className="live-kicker__dot" />
              Live workspace · Tuesday, 18 August 2026
            </div>
            <h1 id="welcome-title">What needs your attention?</h1>
            <p>Ask about the launch, find a decision, or start the next piece of work.</p>
          </section>

          <div className="prompt-panel">
            <div className="prompt-panel__input">
              <ChatCircleDots aria-hidden="true" />
              <textarea
                aria-label="Ask Voidmix"
                placeholder="Ask Voidmix anything about this workspace"
                rows={2}
              />
            </div>
            <div className="prompt-panel__footer">
              <span>Use ⌘ K to search everything</span>
              <button aria-label="Send question" className="send-button" type="button">
                <ArrowRight aria-hidden="true" weight="bold" />
              </button>
            </div>
          </div>

          <section aria-labelledby="continue-title" className="activity-section">
            <div className="section-heading">
              <div>
                <span>Live signal</span>
                <h2 id="continue-title">Continue where you left off</h2>
              </div>
              <button type="button">View all</button>
            </div>

            <article className="thread-card">
              <div className="thread-card__icon">
                <Pulse aria-hidden="true" weight="bold" />
              </div>
              <div className="thread-card__body">
                <div className="thread-card__meta">
                  <span>Northstar / Launch film</span>
                  <Badge tone="positive" withDot>
                    On track
                  </Badge>
                </div>
                <h3>Final cut / v18</h3>
                <p>Review the color pass and close the last delivery decision.</p>
                <div className="thread-card__footer">
                  <span>Updated 8 min ago</span>
                  <button type="button">
                    Open thread <ArrowRight aria-hidden="true" weight="bold" />
                  </button>
                </div>
              </div>
            </article>

            <div className="activity-list" aria-label="Recent workspace activity">
              {activity.map((item) => (
                <article className="activity-row" key={item.title}>
                  <span
                    className={`activity-row__indicator activity-row__indicator--${item.tone}`}
                  />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <span className={`activity-row__state activity-row__state--${item.tone}`}>
                    {item.state}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <aside aria-label="Current project context" className="context-panel">
        <div className="context-heading">
          <div>
            <span>Current project</span>
            <h2>Northstar launch</h2>
          </div>
          <button aria-label="More project actions" type="button">
            ···
          </button>
        </div>

        <div className="context-status">
          <Badge tone="positive" withDot>
            On track
          </Badge>
          <span>Release today · 16:30</span>
        </div>

        <div className="context-block context-block--decision">
          <span className="context-label">Next decision</span>
          <strong>Approve final color pass</strong>
          <p>3 reviewers are ready. Delivery is waiting on this decision.</p>
          <button type="button">
            Review now <ArrowRight aria-hidden="true" weight="bold" />
          </button>
        </div>

        <div className="context-block">
          <div className="context-block__heading">
            <span className="context-label">Workstream</span>
            <span>3 of 4 active</span>
          </div>
          <div className="progress-track">
            <span />
          </div>
          <div className="workstream-list">
            <span className="is-complete">
              <CheckCircle aria-hidden="true" weight="fill" /> Brief
            </span>
            <span className="is-active">
              <Pulse aria-hidden="true" weight="fill" /> Edit
            </span>
            <span>
              <FileText aria-hidden="true" /> Review
            </span>
            <span>
              <FolderSimple aria-hidden="true" /> Release
            </span>
          </div>
        </div>

        <div className="context-block context-block--team">
          <div className="context-block__heading">
            <span className="context-label">Operators</span>
            <span>3 online</span>
          </div>
          <div className="operator-stack">
            {operators.map((operator) => (
              <div className="operator-stack__person" key={operator.name}>
                <Avatar name={operator.name} size="small" />
                <span>
                  <strong>{operator.name}</strong>
                  <small>{operator.role}</small>
                </span>
                <span className="operator-stack__live" />
              </div>
            ))}
          </div>
          <button className="context-link" type="button">
            View team <ArrowRight aria-hidden="true" weight="bold" />
          </button>
        </div>
      </aside>
    </main>
  );
}
