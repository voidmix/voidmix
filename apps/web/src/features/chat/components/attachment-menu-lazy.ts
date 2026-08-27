let attachmentMenuPromise: ReturnType<typeof importAttachmentMenu> | undefined;

function importAttachmentMenu() {
  return import("./attachment-menu");
}

export function loadAttachmentMenu() {
  attachmentMenuPromise ??= importAttachmentMenu();
  return attachmentMenuPromise;
}
