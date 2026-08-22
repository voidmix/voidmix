import { ArrowRight, CheckCircle, FileText, FolderSimple, Pulse } from "@phosphor-icons/react";
import { Avatar } from "@voidmix/ui/avatar";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";

import { operators } from "./data";

export function ProjectContext() {
  return (
    <aside aria-label="Current project context" className="context-panel">
      <div className="context-heading">
        <div>
          <span>Current project</span>
          <h2>Northstar launch</h2>
        </div>
        <Button aria-label="More project actions" size="icon" variant="ghost">
          ···
        </Button>
      </div>

      <div className="context-status">
        <Badge variant="secondary">On track</Badge>
        <span>Release today · 16:30</span>
      </div>

      <div className="context-block context-block--decision">
        <span className="context-label">Next decision</span>
        <strong>Approve final color pass</strong>
        <p>3 reviewers are ready. Delivery is waiting on this decision.</p>
        <Button variant="link">
          Review now <ArrowRight aria-hidden="true" weight="bold" />
        </Button>
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
        <Button className="context-link" variant="link">
          View team <ArrowRight aria-hidden="true" weight="bold" />
        </Button>
      </div>
    </aside>
  );
}
