import { render, Text } from "react-email";
import type { EmailTemplate, SendLinkEmailInput } from "../types.js";
import { MailLayout } from "./layout.js";
import { greeting, linkFallback } from "./shared.js";

export const passwordResetEmail: EmailTemplate<SendLinkEmailInput> = async (input) => {
  const subject = "Reset your Voidmix password";
  const html = await render(
    <MailLayout
      {...(input.baseUrl ? { baseUrl: input.baseUrl } : {})}
      preview="Use this secure link to reset your Voidmix password."
      title="Reset your password"
      action={{ label: "Reset password", url: input.url }}
    >
      <Text>{greeting(input.name)}</Text>
      <Text>We received a request to reset the password for your Voidmix account.</Text>
      <Text>If the button does not work, copy the link below into your browser:</Text>
      <Text>{input.url}</Text>
    </MailLayout>,
  );
  const text = [
    greeting(input.name),
    "",
    "We received a request to reset the password for your Voidmix account.",
    "",
    linkFallback("Reset password", input.url),
    "",
    "If you did not request a password reset, you can safely ignore this message.",
  ].join("\n");
  return { subject, html, text };
};
