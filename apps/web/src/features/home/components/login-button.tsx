import { SignIn } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { lazy, Suspense, useState } from "react";

const LazyLoginDialog = lazy(async () => {
  const module = await import("./login-dialog");
  return { default: module.LoginDialog };
});

function preloadLoginDialog() {
  void import("./login-dialog");
}

export function LoginButton() {
  const t = useTranslations("auth");
  const [open, setOpen] = useState(false);
  const [dialogReady, setDialogReady] = useState(false);

  const createTrigger = (onClick?: () => void) => (
    <Button
      aria-label={t("signIn")}
      className="w-full justify-start gap-2.5 rounded-md px-1.5 text-left max-[1180px]:size-10 max-[1180px]:min-h-0 max-[1180px]:justify-center max-[1180px]:gap-0 max-[1180px]:px-0"
      onClick={onClick}
      onFocus={preloadLoginDialog}
      onPointerDown={preloadLoginDialog}
      size="sm"
      title={t("signIn")}
      variant="ghost"
    >
      <SignIn aria-hidden="true" data-icon="inline-start" weight="bold" />
      <span className="max-[1180px]:hidden">{t("signIn")}</span>
    </Button>
  );

  const openDialog = () => {
    setOpen(true);
    setDialogReady(true);
    preloadLoginDialog();
  };

  if (!dialogReady) return createTrigger(openDialog);

  return (
    <Suspense fallback={createTrigger(openDialog)}>
      <LazyLoginDialog onOpenChange={setOpen} open={open} trigger={createTrigger()} />
    </Suspense>
  );
}
