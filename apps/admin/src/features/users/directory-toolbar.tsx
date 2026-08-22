import { MagnifyingGlass, SlidersHorizontal } from "@phosphor-icons/react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { cn } from "@voidmix/ui/lib/utils";
import type { UserStatus } from "./types";

export function DirectoryToolbar({
  query,
  setQuery,
  status,
  setStatus,
}: {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  status: UserStatus | undefined;
  setStatus: Dispatch<SetStateAction<UserStatus | undefined>>;
}) {
  return (
    <div className="directory-toolbar">
      <div className="search-box">
        <MagnifyingGlass weight="regular" />
        <input
          aria-label="Search users"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search name or email..."
          type="search"
          value={query}
        />
      </div>
      <div aria-label="Filter by status" className="filters">
        <FilterButton active={status === undefined} onClick={() => setStatus(undefined)}>
          All
        </FilterButton>
        <FilterButton active={status === "active"} onClick={() => setStatus("active")}>
          Active
        </FilterButton>
        <FilterButton active={status === "suspended"} onClick={() => setStatus("suspended")}>
          Suspended
        </FilterButton>
      </div>
      <Button aria-label="More filters" className="filter-icon" size="icon-sm" variant="ghost">
        <SlidersHorizontal weight="regular" />
      </Button>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      className={cn("filter-button", active && "active")}
      onClick={onClick}
      size="sm"
      variant={active ? "primary" : "ghost"}
    >
      {children}
    </Button>
  );
}
