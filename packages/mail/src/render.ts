import type { EmailTemplate, EmailTemplateResult } from "./types.js";

export async function renderTemplate<Input>(
  template: EmailTemplate<Input>,
  input: Input,
): Promise<EmailTemplateResult> {
  const result = await template(input);
  return {
    subject: result.subject,
    html: result.html,
    text: result.text,
  };
}
