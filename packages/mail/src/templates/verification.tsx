import { Text } from "react-email";
import { render } from "react-email";
import type { EmailTemplate, SendLinkEmailInput } from "../types.js";
import { MailLayout } from "./layout.js";
import { greeting, linkFallback } from "./shared.js";

export const verificationEmail: EmailTemplate<SendLinkEmailInput> = async (input) => {
  const subject = "Verify your Voidmix email";
  const html = await render(
    <MailLayout
      {...(input.baseUrl ? { baseUrl: input.baseUrl } : {})}
      preview="Confirm your email address to finish setting up Voidmix."
      title="Verify your email"
      action={{ label: "Verify email", url: input.url }}
    >
      <Text>{greeting(input.name)}</Text>
      <Text>Confirm this email address to finish setting up your Voidmix account.</Text>
      <Text>If the button does not work, copy the link below into your browser:</Text>
      <Text>{input.url}</Text>
    </MailLayout>,
  );
  const text = [
    greeting(input.name),
    "",
    "Confirm this email address to finish setting up your Voidmix account.",
    "",
    linkFallback("Verify email", input.url),
    "",
    "If you did not create this account, you can safely ignore this message.",
  ].join("\n");
  return { subject, html, text };
};
