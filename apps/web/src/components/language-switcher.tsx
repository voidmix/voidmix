import { CaretDown, Translate } from "@phosphor-icons/react";
import { useLocale, useSetLocale, useTranslations } from "@voidmix/i18n/client";
import type { Locale } from "@voidmix/i18n/types";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import { useState } from "react";

import { loadCommonMessages } from "../i18n/common";

const languageOptions: ReadonlyArray<{ label: string; value: Locale }> = [
  { label: "English", value: "en" },
  { label: "简体中文", value: "zh" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useTranslations("common", loadCommonMessages);
  const [pending, setPending] = useState(false);
  const currentLabel =
    languageOptions.find((option) => option.value === locale)?.label ?? "English";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`${t("language")}: ${currentLabel}`}
            disabled={pending}
            size="sm"
            title={`${t("language")}: ${currentLabel}`}
            variant="ghost"
          >
            <Translate aria-hidden="true" data-icon="inline-start" />
            <span aria-hidden="true">{locale === "en" ? "EN" : "中文"}</span>
            <CaretDown aria-hidden="true" data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            if (value === locale) return;
            setPending(true);
            void setLocale(value as Locale)
              .catch(() => undefined)
              .finally(() => setPending(false));
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
