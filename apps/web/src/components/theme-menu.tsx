import type { ReactElement } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import { ThemeMenuItems } from "./theme-menu-items";

export interface ThemeMenuProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  trigger: ReactElement;
}

export function ThemeMenu({ onOpenChange, open, trigger }: ThemeMenuProps) {
  return (
    <DropdownMenu onOpenChange={onOpenChange} open={open}>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-36">
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
