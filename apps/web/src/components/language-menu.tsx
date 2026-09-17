import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import type { Locale } from "@voidmix/i18n/types";
import type { ReactElement } from "react";
import { languageLabels } from "./language-options";

export interface LanguageMenuProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending: boolean;
  trigger: ReactElement;
}

export function LanguageMenu({
  locale,
  onLocaleChange,
  onOpenChange,
  open,
  pending,
  trigger,
}: LanguageMenuProps) {
  return (
    <DropdownMenu onOpenChange={onOpenChange} open={open}>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            if (value !== locale) onLocaleChange(value as Locale);
          }}
          value={locale}
        >
          {Object.entries(languageLabels).map(([value, label]) => (
            <DropdownMenuRadioItem disabled={pending} key={value} value={value} lang={value}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
