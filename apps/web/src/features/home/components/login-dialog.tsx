import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@voidmix/ui/components/ui/dialog";
import type { ReactElement } from "react";

import { useTranslations } from "@voidmix/i18n/client";
import { AuthForm } from "../../auth/auth-form";

export function LoginDialog({
  onOpenChange,
  open,
  trigger,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  trigger: ReactElement;
}) {
  const t = useTranslations("auth");

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-md bg-transparent p-0 ring-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("welcomeBack")}</DialogTitle>
          <DialogDescription>{t("loginDescription")}</DialogDescription>
        </DialogHeader>
        <AuthForm mode="login" onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
