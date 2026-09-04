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

export function LoginButton({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("auth");
  const [open, setOpen] = useState(false);
  const [dialogReady, setDialogReady] = useState(false);

  const createTrigger = (onClick?: () => void) => (
    <Button
      aria-label={t("signIn")}
      className={`w-full justify-start gap-2.5 rounded-md px-1.5 text-left ${compact ? "mx-auto size-10 min-h-0 justify-center gap-0 px-0" : ""}`}
      onClick={onClick}
      onFocus={preloadLoginDialog}
      onPointerDown={preloadLoginDialog}
      size="sm"
      title={t("signIn")}
      variant="ghost"
    >
      <SignIn aria-hidden="true" weight="bold" />
      <span className={compact ? "hidden" : ""}>{t("signIn")}</span>
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
