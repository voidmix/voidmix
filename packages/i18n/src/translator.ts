import type { Locale, MessageCatalog } from "./types.js";

export type Translator = (key: string, values?: Record<string, unknown>) => string;

export function createTranslator(messages: MessageCatalog, _locale: Locale): Translator {
  return (key, values) => {
    const message = messages[key];
    if (!message) throw new Error(`Translation "${key}" is missing`);
    return message(values);
  };
}
