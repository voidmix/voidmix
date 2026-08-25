import { Link } from "@tanstack/react-router";
import { useOptionalTranslations } from "@voidmix/i18n/client";
import { buttonVariants } from "@voidmix/ui/components/ui/button";

import { loadAuthMessages } from "../../../i18n/auth";

export function AuthActions() {
  const t = useOptionalTranslations("auth", loadAuthMessages, (key) => {
    const fallback: Record<string, string> = {
      account: "Account",
      signIn: "Log in",
      createAccount: "Create account",
    };
    return fallback[key] ?? key;
  });

  return (
    <nav aria-label={t("account")} className="flex items-center gap-1">
      <Link className={buttonVariants({ variant: "ghost" })} data-slot="button" to="/login">
        {t("signIn")}
      </Link>
      <Link className={buttonVariants()} data-slot="button" to="/register">
        <span className="hidden min-[480px]:inline">{t("createAccount")}</span>
        <span className="min-[480px]:hidden">{t("createAccount")}</span>
      </Link>
    </nav>
  );
}
