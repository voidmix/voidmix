import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "../../features/auth/auth-form";
import { validateAuthSearch } from "../../features/auth/route-search";

export const Route = createFileRoute("/(auth)/login")({
  validateSearch: validateAuthSearch,
  component: LoginRoute,
  head: () => ({
    meta: [
      { title: "Sign in | Voidmix" },
      { name: "description", content: "Sign in to continue to your Voidmix workspace." },
    ],
  }),
});

function LoginRoute() {
  const { redirect } = Route.useSearch();
  return <AuthForm mode="login" {...(redirect ? { redirectTo: redirect } : {})} />;
}
