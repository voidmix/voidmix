import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Button, buttonVariants } from "@voidmix/ui/components/ui/button";
import { signOut, useSession } from "../../../lib/auth-client";

export function AuthActions() {
  const t = useTranslations("auth");
  const navigate = useNavigate();
  const session = useSession();

  if (session.isPending) return null;

  if (session.data) {
    const name = session.data.user.name || session.data.user.email;

    return (
      <nav aria-label={t("account")} className="flex items-center gap-2">
        <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:inline">
          {name}
        </span>
        <Button
          onClick={async () => {
            await signOut();
            await navigate({ to: "/" });
          }}
          variant="ghost"
        >
          {t("signOut")}
        </Button>
      </nav>
    );
  }

  return (
    <nav aria-label={t("account")} className="flex items-center gap-1">
      <Link className={buttonVariants({ variant: "ghost" })} data-slot="button" to="/login">
        {t("signIn")}
      </Link>
      <Link className={buttonVariants()} data-slot="button" to="/signup">
        <span className="hidden min-[480px]:inline">{t("createAccount")}</span>
        <span className="min-[480px]:hidden">{t("createAccount")}</span>
      </Link>
    </nav>
  );
}
