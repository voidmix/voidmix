import { ArrowRight, Pulse } from "@phosphor-icons/react";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";

import { activity, activityIndicatorClassName, activityStateClassName } from "./data";

export function ActivitySection() {
  return (
    <section aria-labelledby="continue-title" className="activity-section">
      <div className="section-heading">
        <div>
          <span>Live signal</span>
          <h2 id="continue-title">Continue where you left off</h2>
        </div>
        <Button variant="link">View all</Button>
      </div>

      <article className="thread-card">
        <div className="thread-card__icon">
          <Pulse aria-hidden="true" weight="bold" />
        </div>
        <div className="thread-card__body">
          <div className="thread-card__meta">
            <span>Northstar / Launch film</span>
            <Badge variant="secondary">On track</Badge>
          </div>
          <h3>Final cut / v18</h3>
          <p>Review the color pass and close the last delivery decision.</p>
          <div className="thread-card__footer">
            <span>Updated 8 min ago</span>
            <Button variant="link">
              Open thread <ArrowRight aria-hidden="true" weight="bold" />
            </Button>
          </div>
        </div>
      </article>

      <div className="activity-list" aria-label="Recent workspace activity">
        {activity.map((item) => (
          <article className="activity-row" key={item.title}>
            <span className={activityIndicatorClassName(item.tone)} />
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            <span className={activityStateClassName(item.tone)}>{item.state}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
