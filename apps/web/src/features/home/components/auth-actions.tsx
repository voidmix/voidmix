import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { buttonVariants } from "@voidmix/ui/components/ui/button";
import { signOut, useSession } from "../../../lib/auth-client";
import { UserDropdown } from "./user-dropdown";

export function AuthActions() {
  const t = useTranslations("auth");
  const navigate = useNavigate();
  const session = useSession();

  if (session.isPending) return null;

  if (session.data) {
    const user = session.data.user;
    const role = (user as { role?: string | null }).role;

    return (
      <nav aria-label={t("account")} className="flex items-center">
        <UserDropdown
          onNewTask={() => void navigate({ to: "/" })}
          onSignOut={async () => {
            await signOut();
            await navigate({ to: "/" });
          }}
          user={{ email: user.email, name: user.name, ...(role !== undefined ? { role } : {}) }}
        />
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
