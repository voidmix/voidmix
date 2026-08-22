import { Export, UserPlus } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { UserDirectory } from "./directory";
import { MetricGrid } from "./metric-grid";

export function UserDirectoryPage() {
  return (
    <>
      <header className="admin-header">
        <div>
          <span>Control / User operations</span>
          <h1>User directory</h1>
          <p>Search accounts, review access, and act without losing the audit trail.</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary">
            <Export data-icon="inline-start" weight="regular" /> Export
          </Button>
          <Button>
            <UserPlus data-icon="inline-start" weight="regular" /> Invite user
          </Button>
        </div>
      </header>
      <MetricGrid />
      <UserDirectory />
    </>
  );
}
