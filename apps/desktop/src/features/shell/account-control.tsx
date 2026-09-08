import { UserCircle } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { Avatar } from "@voidmix/ui/avatar";
import { useEffect, useState } from "react";
import { loadAccount, type AccountState } from "../../lib/account";

export function AccountControl() {
  const t = useTranslations("common");
  const [account, setAccount] = useState<AccountState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = () => {
      const current = ++revision;
      void loadAccount().then((result) => {
        if (active && revision === current) setAccount(result);
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const profile = account.status === "signed_in" ? account.profile : null;
  const label = profile
    ? profile.displayName
    : t(
        account.status === "loading"
          ? "accountLoading"
          : account.status === "preview"
            ? "previewAccount"
            : account.status === "signed_out"
              ? "signedOut"
              : "accountUnavailable",
      );

  return (
    <div className="account-control" aria-label={t("account")}>
      {profile ? (
        <Avatar name={profile.displayName} size="small" />
      ) : (
        <UserCircle size={28} aria-hidden="true" />
      )}
      <span aria-live="polite">
        <strong>{label}</strong>
        <small title={profile?.email}>{profile?.email ?? t("personalStudio")}</small>
      </span>
    </div>
  );
}
