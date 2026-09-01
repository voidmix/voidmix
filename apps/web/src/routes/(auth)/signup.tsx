import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "../../features/auth/auth-form";
import { validateAuthSearch } from "../../features/auth/route-search";

export const Route = createFileRoute("/(auth)/signup")({
  validateSearch: validateAuthSearch,
  component: SignupRoute,
  head: () => ({
    meta: [
      { title: "Create account | Voidmix" },
      { name: "description", content: "Create a Voidmix account with your work email." },
    ],
  }),
});

function SignupRoute() {
  const { redirect } = Route.useSearch();
  return <AuthForm mode="signup" {...(redirect ? { redirectTo: redirect } : {})} />;
}
