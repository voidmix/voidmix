import { DirectoryProvider } from "../../../features/admin/users/store-provider";
import { directorySearch } from "../../../features/admin/users/search";
import { createApiUsersAdapter } from "../../../features/admin/users/api-adapter";
import { createRouteApiClient } from "../../../lib/route-api";
import { useSession } from "../../../lib/auth-client";
import { RoutePending, RouteError } from "../../../features/navigation/route-state";
import { UserPlus } from "@phosphor-icons/react";
import { createFileRoute, useRouter, useLocation } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";

import { UserDirectory } from "../../../features/admin/users/directory";
import { useTranslations } from "../../../i18n/client";
import { localizedRouteHead } from "../../../i18n/route-meta";

export const Route = createFileRoute("/(app)/(admin)/admin")({
  validateSearch: directorySearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, abortController, context }) => ({
    accountId: context.accountId,
    ...(await createApiUsersAdapter(createRouteApiClient()).listUsers(
      { ...deps, limit: 50 },
      abortController.signal,
    )),
  }),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: AdminUsersRoute,
  head: ({ matches }) => localizedRouteHead(matches, "adminTitle", "adminDescription"),
});

function AdminUsersRoute() {
  const t = useTranslations("admin");
  const page = Route.useLoaderData();
  const search = directorySearch(useLocation({ select: (location) => location.search }));
  const navigate = Route.useNavigate();
  const router = useRouter();
  const session = useSession();
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
      <DirectoryProvider key={session.data?.user.id ?? "anonymous"}>
        <UserDirectory
          page={page}
          search={search}
          onSearch={(patch) =>
            void navigate({
              search: directorySearch({ ...search, ...patch }),
              replace: !("cursor" in patch && patch.cursor),
            })
          }
          reload={async () => {
            await router.invalidate({ filter: (match) => match.routeId === Route.id, sync: true });
          }}
        />
      </DirectoryProvider>
      <p className="sr-only" id="invite-user-note">
        {t("inviteUnavailableNote")}
      </p>
    </>
  );
}
