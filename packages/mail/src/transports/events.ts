import { logger } from "@voidmix/logger";

import type { MailDeliveryRecorder } from "../types.js";

export const recordMailDelivery: MailDeliveryRecorder = (event) => {
  const log = logger({
    operation: "mail.delivery",
    recipient: event.recipient,
    template: event.template,
    transport: event.transport,
    outcome: event.outcome,
    ...(event.messageId ? { messageId: event.messageId } : {}),
  });
  if (event.outcome === "failed") log.error("Mail delivery failed");
  else log.info("Mail delivery completed");
  log.emit();
};
