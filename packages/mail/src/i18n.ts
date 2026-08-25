import { createTranslator } from "@voidmix/i18n";
import type { Locale, MessageCatalog } from "@voidmix/i18n/types";

import { loadNamespace as loadCommon } from "./generated/i18n/messages/_namespaces/636f6d6d6f6e/loader.js";
import { loadNamespace as loadPasswordReset } from "./generated/i18n/messages/_namespaces/70617373776f72645265736574/loader.js";
import { loadNamespace as loadVerification } from "./generated/i18n/messages/_namespaces/766572696669636174696f6e/loader.js";
import { loadNamespace as loadWelcome } from "./generated/i18n/messages/_namespaces/77656c636f6d65/loader.js";

export const mailMessages = {
  common: loadCommon,
  passwordReset: loadPasswordReset,
  verification: loadVerification,
  welcome: loadWelcome,
} satisfies Record<string, (locale: Locale) => Promise<MessageCatalog>>;

export async function loadMailTranslator(namespace: keyof typeof mailMessages, locale: Locale) {
  const messages = await mailMessages[namespace](locale);
  return createTranslator(messages, locale);
}
