import { Bell, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";

import { ActivitySection } from "./activity-section";
import { ProjectContext } from "./project-context";
import { PromptPanel } from "./prompt-panel";
import { HomeSidebar } from "./sidebar";

export function HomePage() {
  return (
    <main className="app-shell">
      <HomeSidebar />

      <section className="app-main" id="overview">
        <header className="app-topbar">
          <div className="topbar-location">
            <span>Northstar</span>
            <span aria-hidden="true">/</span>
            <strong>Overview</strong>
          </div>
          <div className="topbar-actions">
            <Button aria-label="Search workspace" size="icon" variant="ghost">
              <MagnifyingGlass aria-hidden="true" />
            </Button>
            <Button aria-label="Open notifications" size="icon" variant="ghost">
              <Bell aria-hidden="true" />
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

          <div className="home-content-grid">
            <div className="home-primary">
              <PromptPanel />
              <ActivitySection />
            </div>
            <ProjectContext />
          </div>
        </div>
      </section>
    </main>
  );
}
