import { Dialog } from "@base-ui/react/dialog";
import { X } from "@phosphor-icons/react";
import type { ReactElement, ReactNode } from "react";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";

export function Modal({
  title,
  description,
  closeLabel,
  trigger,
  children,
  open,
  onOpenChange,
  drawer = false,
  busy = false,
}: {
  title: string;
  description?: string;
  closeLabel: string;
  trigger: ReactElement;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawer?: boolean;
  busy?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy || next) onOpenChange(next);
      }}
    >
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex flex-col gap-6 bg-popover p-6 text-popover-foreground outline-none",
            drawer
              ? "inset-y-0 left-0 w-72 max-w-[90vw]"
              : "top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              render={
                <Button size="icon" variant="ghost" aria-label={closeLabel} disabled={busy}>
                  <X aria-hidden="true" />
                </Button>
              }
            />
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
