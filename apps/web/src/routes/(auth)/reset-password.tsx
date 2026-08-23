import { createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "../../features/auth/reset-password";

export const Route = createFileRoute("/(auth)/reset-password")({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.token === "string" && search.token ? { token: search.token } : {},
  component: ResetPasswordRoute,
});

function ResetPasswordRoute() {
  const { token } = Route.useSearch();
  return <ResetPassword {...(token ? { token } : {})} />;
}
