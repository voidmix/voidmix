import { MagnifyingGlass, SlidersHorizontal } from "@phosphor-icons/react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@voidmix/ui/components/ui/input-group";
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
    <div className="flex min-h-16 items-center gap-4 border-b px-4 max-[760px]:flex-wrap max-[760px]:items-stretch max-[760px]:py-3">
      <InputGroup className="max-w-sm max-[760px]:max-w-none max-[760px]:basis-full">
        <InputGroupAddon>
          <MagnifyingGlass weight="regular" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Search users"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search name or email..."
          type="search"
          value={query}
        />
      </InputGroup>
      <div aria-label="Filter by status" className="ml-auto flex gap-1 max-[760px]:ml-0">
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
      <Button aria-label="More filters" size="icon-sm" variant="ghost">
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
      onClick={onClick}
      size="sm"
      variant={active ? "primary" : "ghost"}
    >
      {children}
    </Button>
  );
}
