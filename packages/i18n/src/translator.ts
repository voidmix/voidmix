import { createTranslator as createIntlTranslator } from "use-intl/core";

import type { Locale, MessageCatalog, TranslationValues } from "./types.js";

export type Translator = (key: string, values?: TranslationValues) => string;

export type CreateTranslatorOptions = {
  locale: Locale;
  messages: MessageCatalog;
  namespace?: string;
};

export function createTranslator({
  locale,
  messages,
  namespace,
}: CreateTranslatorOptions): Translator {
  const translator = createIntlTranslator({
    locale,
    messages,
    ...(namespace ? { namespace } : {}),
  });

  return (key, values) => (translator as unknown as Translator)(key, values);
}
