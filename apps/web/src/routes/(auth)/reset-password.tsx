import { createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "../../features/auth/reset-password";
import { validateAuthSearch } from "../../features/auth/route-search";

export const Route = createFileRoute("/(auth)/reset-password")({
  validateSearch: (search: Record<string, unknown>) => {
    const authSearch = validateAuthSearch(search);
    const token = typeof search.token === "string" && search.token ? search.token : undefined;
    return { ...authSearch, ...(token ? { token } : {}) };
  },
  component: ResetPasswordRoute,
  head: () => ({
    meta: [
      { title: "Reset password | Voidmix" },
      { name: "description", content: "Reset your Voidmix account password securely." },
    ],
  }),
});

function ResetPasswordRoute() {
  const { redirect, token } = Route.useSearch();
  return (
    <ResetPassword {...(redirect ? { redirectTo: redirect } : {})} {...(token ? { token } : {})} />
  );
}
