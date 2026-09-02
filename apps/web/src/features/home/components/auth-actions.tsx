import { Link } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { buttonVariants } from "@voidmix/ui/components/ui/button";
import { useSession } from "../../../lib/auth-client";

export function AuthActions() {
  const t = useTranslations("auth");
  const session = useSession();

  if (session.isPending) return null;

  if (session.data) return null;

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
