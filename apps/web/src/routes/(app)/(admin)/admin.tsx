import { UserPlus } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";

import { UserDirectory } from "../../../features/admin/users/directory";
import { useTranslations } from "../../../i18n/client";
import { localizedRouteHead } from "../../../i18n/route-meta";

export const Route = createFileRoute("/(app)/(admin)/admin")({
  component: AdminUsersRoute,
  head: ({ matches }) => localizedRouteHead(matches, "adminTitle", "adminDescription"),
});

function AdminUsersRoute() {
  const t = useTranslations("admin");
  return (
    <>
      <header className="flex items-end justify-between py-9 pt-14 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-6 max-[760px]:pt-10">
        <div>
          <span className="text-xs font-semibold text-muted-foreground">
            {t("controlUserOperations")}
          </span>
          <h1 className="mt-3 text-[clamp(2.1rem,4vw,3.6rem)] leading-none font-bold tracking-[-0.04em]">
            {t("userDirectory")}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            {t("userDirectoryDescription")}
          </p>
        </div>
        <div className="flex gap-2.5 max-[480px]:w-full">
          <Button
            aria-describedby="invite-user-note"
            className="max-[480px]:flex-1"
            disabled
            title={t("inviteUnavailable")}
          >
            <UserPlus data-icon="inline-start" weight="regular" /> {t("inviteUser")}
          </Button>
        </div>
      </header>
      <UserDirectory />
      <p className="sr-only" id="invite-user-note">
        {t("inviteUnavailableNote")}
      </p>
    </>
  );
}
