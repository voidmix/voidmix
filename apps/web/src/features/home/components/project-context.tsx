import { ArrowRight, CheckCircle, FileText, FolderSimple, Pulse } from "@phosphor-icons/react";
import { Avatar } from "@voidmix/ui/avatar";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";

import { operators } from "../data";

export function ProjectContext() {
  return (
    <aside
      aria-label="Current project context"
      className="sticky top-6 min-h-0 max-h-[calc(100dvh-18rem)] overflow-y-auto rounded-xl border border-border bg-sidebar p-[1.15rem] min-[1181px]:col-start-2 min-[1181px]:row-span-2 max-[1180px]:static max-[1180px]:max-h-none max-[1180px]:overflow-visible"
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[0.72rem] text-muted-foreground">Current project</span>
          <h2 className="mt-1.5 text-[1.1rem] leading-tight tracking-[-0.02em] text-balance">
            Northstar launch
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-b border-border py-4 pb-5">
        <Badge variant="secondary">On track</Badge>
        <span className="text-[0.7rem] text-muted-foreground">Release today · 16:30</span>
      </div>

      <div className="border-b border-border py-5">
        <span className="block text-[0.7rem] font-semibold text-muted-foreground">
          Next decision
        </span>
        <strong className="mt-2.5 block text-[0.84rem] leading-[1.35]">
          Approve final color pass
        </strong>
        <p className="mt-2 text-[0.72rem] leading-[1.5] text-secondary-foreground text-pretty">
          3 reviewers are ready. Delivery is waiting on this decision.
        </p>
        <Button className="h-auto p-0" variant="link">
          Review now
          <ArrowRight aria-hidden="true" data-icon="inline-end" weight="bold" />
        </Button>
      </div>

      <div className="border-b border-border py-5">
        <div className="flex items-center justify-between">
          <span className="block text-[0.7rem] font-semibold text-muted-foreground">
            Workstream
          </span>
          <span className="text-[0.7rem] text-muted-foreground">3 of 4 active</span>
        </div>
        <div className="my-3.5 h-[0.3rem] w-full overflow-hidden bg-border">
          <span className="block h-full w-3/4 bg-primary" />
        </div>
        <div className="grid gap-2">
          <span className="flex items-center gap-2 text-[0.72rem] text-primary">
            <CheckCircle aria-hidden="true" weight="fill" /> Brief
          </span>
          <span className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
            <Pulse aria-hidden="true" weight="fill" /> Edit
          </span>
          <span className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
            <FileText aria-hidden="true" /> Review
          </span>
          <span className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
            <FolderSimple aria-hidden="true" /> Release
          </span>
        </div>
      </div>

      <div className="border-b border-border py-5">
        <div className="flex items-center justify-between">
          <span className="block text-[0.7rem] font-semibold text-muted-foreground">Operators</span>
          <span className="text-[0.7rem] text-muted-foreground">3 online</span>
        </div>
        <div className="mt-4 grid gap-3">
          {operators.map((operator) => (
            <div className="flex items-center gap-2.5" key={operator.name}>
              <Avatar name={operator.name} size="small" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <strong className="text-[0.72rem]">{operator.name}</strong>
                <small className="text-[0.7rem] text-muted-foreground">{operator.role}</small>
              </span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
          ))}
        </div>
        <Button className="mt-4 h-auto p-0" variant="link">
          View team
          <ArrowRight aria-hidden="true" data-icon="inline-end" weight="bold" />
        </Button>
      </div>
    </aside>
  );
}
