import { createFileRoute } from "@tanstack/react-router";
import { VerifyEmail } from "../../features/auth/verify-email";

export const Route = createFileRoute("/(auth)/verify-email")({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.token === "string" && search.token ? { token: search.token } : {},
  component: VerifyEmailRoute,
});

function VerifyEmailRoute() {
  const { token } = Route.useSearch();
  return <VerifyEmail {...(token ? { token } : {})} />;
}
