import { render, Text } from "react-email";
import type { Locale } from "@voidmix/i18n/types";
import { createMailTranslator } from "../i18n.js";
import { MailLayout } from "./layout.js";

/** Render the administrator's configuration probe through the same layout as user mail. */
export const testEmail = async (locale: Locale = "en") => {
  const t = createMailTranslator("test", locale);
  const common = createMailTranslator("common", locale);
  const body = t("body");
  const html = await render(
    <MailLayout footer={common("footer")} locale={locale} preview={body} title={t("subject")}>
      <Text>{body}</Text>
    </MailLayout>,
  );
  return { subject: t("subject"), html, text: body };
};
