import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import type { Locale } from "@voidmix/i18n/types";
import type { ReactElement } from "react";

export interface LanguageMenuProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending: boolean;
  trigger: ReactElement;
}

const languageOptions: ReadonlyArray<{ label: string; value: Locale }> = [
  { label: "English", value: "en" },
  { label: "简体中文", value: "zh" },
];

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
          {languageOptions.map((option) => (
            <DropdownMenuRadioItem disabled={pending} key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
