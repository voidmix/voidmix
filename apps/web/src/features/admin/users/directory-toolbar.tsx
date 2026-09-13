import { CaretDown, DownloadSimple, FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@voidmix/ui/components/ui/input-group";
import type { UserRole, UserStatus } from "./types";
import { useTranslations } from "../../../i18n/client";
import { formatAdminRole } from "./display";

export function DirectoryToolbar({
  query,
  setQuery,
  status,
  setStatus,
  role,
  setRole,
  onExport,
}: {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  status: UserStatus | undefined;
  setStatus: Dispatch<SetStateAction<UserStatus | undefined>>;
  role: UserRole | undefined;
  setRole: Dispatch<SetStateAction<UserRole | undefined>>;
  onExport: () => void;
}) {
  const t = useTranslations("admin");
  return (
    <div className="flex min-h-16 items-center gap-3 border-b px-4 max-[760px]:flex-wrap max-[760px]:items-stretch max-[760px]:py-3">
      <InputGroup className="max-w-sm max-[760px]:max-w-none max-[760px]:basis-full">
        <InputGroupAddon>
          <MagnifyingGlass weight="regular" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={t("searchUsers")}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t("searchNameEmail")}
          type="search"
          value={query}
        />
      </InputGroup>
      <div aria-label={t("filterStatus")} className="ml-auto flex gap-1 max-[760px]:ml-0">
        <FilterButton active={status === undefined} onClick={() => setStatus(undefined)}>
          {t("allStatuses")}
        </FilterButton>
        <FilterButton active={status === "active"} onClick={() => setStatus("active")}>
          {t("active")}
        </FilterButton>
        <FilterButton active={status === "suspended"} onClick={() => setStatus("suspended")}>
          {t("suspended")}
        </FilterButton>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={t("filterRole")}
              className="gap-1.5"
              size="sm"
              variant={role ? "secondary" : "outline"}
            >
              <FunnelSimple aria-hidden="true" weight="regular" />
              {role ? formatAdminRole(role, t) : t("role")}
              <CaretDown aria-hidden="true" className="size-3" weight="bold" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-36">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("filterRole")}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            onValueChange={(value) => setRole(value === "all" ? undefined : (value as UserRole))}
            value={role ?? "all"}
          >
            <DropdownMenuRadioItem value="all">{t("allRoles")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="owner">{t("owner")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="admin">{t("admin")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="user">{t("member")}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button aria-label={t("exportVisible")} onClick={onExport} size="sm" variant="outline">
        <DownloadSimple aria-hidden="true" weight="regular" />
        <span className="max-[480px]:hidden">{t("export")}</span>
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
