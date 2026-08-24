export type MailAddress = {
  email: string;
  name?: string;
};

export type MailTemplateKind = "email-verification" | "password-reset" | "welcome" | "test";

export type MissingMailConfiguration = "RESEND_API_KEY" | "MAIL_FROM";

export interface ResolvedMailConfiguration {
  enabled: boolean;
  from: string | null;
  fromName: string;
  templatesBaseUrl: string | null;
  resendApiKey: string | null;
}

export type MailMessage = {
  template: MailTemplateKind;
  from: MailAddress;
  to: MailAddress | MailAddress[];
  subject: string;
  html: string;
  text: string;
  replyTo?: MailAddress;
};

export type MailSendResult = { ok: true; id?: string } | { ok: false; error: string };

export interface MailTransport {
  send(message: MailMessage): Promise<MailSendResult>;
}

export type MailDeliveryEvent = {
  recipient: string | string[];
  template: MailTemplateKind;
  transport: "logger" | "resend";
  outcome: "failed" | "logged" | "sent";
  messageId?: string;
};

export type MailDeliveryRecorder = (event: MailDeliveryEvent) => void;

export type EmailTemplateResult = {
  subject: string;
  html: string;
  text: string;
};

export type EmailTemplate<Input> = (input: Input) => Promise<EmailTemplateResult>;

export type SendLinkEmailInput = {
  email: string;
  name?: string | null;
  url: string;
  baseUrl?: string;
};

export type SendWelcomeEmailInput = {
  email: string;
  name?: string | null;
};

export type WelcomeTemplateInput = SendWelcomeEmailInput & {
  appUrl?: string;
};

export interface Mailer {
  sendVerification(input: SendLinkEmailInput): Promise<void>;
  sendPasswordReset(input: SendLinkEmailInput): Promise<void>;
  sendWelcome(input: SendWelcomeEmailInput): Promise<void>;
  sendTest(input: SendWelcomeEmailInput): Promise<void>;
}
