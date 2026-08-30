import { Export, UserPlus } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";

import { UserDirectory } from "../../../features/admin/users/directory";
import { MetricGrid } from "../../../features/admin/users/metric-grid";

export const Route = createFileRoute("/(app)/(admin)/admin")({
  component: AdminUsersRoute,
  head: () => ({
    meta: [
      { title: "Voidmix Control" },
      { name: "description", content: "User operations and audit control for Voidmix." },
    ],
  }),
});

function AdminUsersRoute() {
  return (
    <>
      <header className="flex items-end justify-between py-9 pt-14 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-6 max-[760px]:pt-10">
        <div>
          <span className="text-xs font-semibold text-muted-foreground">
            Control / User operations
          </span>
          <h1 className="mt-3 text-[clamp(2.1rem,4vw,3.6rem)] leading-none font-bold tracking-[-0.04em]">
            User directory
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Search accounts, review access, and act without losing the audit trail.
          </p>
        </div>
        <div className="flex gap-2.5 max-[480px]:w-full">
          <Button className="max-[480px]:flex-1" variant="secondary">
            <Export data-icon="inline-start" weight="regular" /> Export
          </Button>
          <Button className="max-[480px]:flex-1">
            <UserPlus data-icon="inline-start" weight="regular" /> Invite user
          </Button>
        </div>
      </header>
      <MetricGrid />
      <UserDirectory />
    </>
  );
}
