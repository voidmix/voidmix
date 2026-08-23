import { render, Text } from "react-email";
import type { EmailTemplate, WelcomeTemplateInput } from "../types.js";
import { MailLayout } from "./layout.js";
import { greeting } from "./shared.js";

export const welcomeEmail: EmailTemplate<WelcomeTemplateInput> = async (input) => {
  const subject = "Welcome to Voidmix";
  const html = await render(
    <MailLayout
      preview="Your Voidmix account is ready."
      title="Welcome to Voidmix"
      {...(input.appUrl ? { action: { label: "Open Voidmix", url: input.appUrl } } : {})}
    >
      <Text>{greeting(input.name)}</Text>
      <Text>Your account is ready. You can now sign in and start working with your team.</Text>
    </MailLayout>,
  );
  const text = [
    greeting(input.name),
    "",
    "Welcome to Voidmix. Your account is ready.",
    input.appUrl ? `\nOpen Voidmix:\n${input.appUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, html, text };
};
