import type { Locale } from "@voidmix/i18n/types";

// Language names stay in their own language regardless of the current locale.
export const languageLabels = {
  en: "English",
  zh: "简体中文",
} as const satisfies Record<Locale, string>;
