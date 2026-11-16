import { createFileRoute } from "@tanstack/react-router"
import { AuthScreen } from "@/components/auth-screen"

export const Route = createFileRoute("/authorize")({
  validateSearch: (search: Record<string, unknown>) => ({
    user_code: typeof search.user_code === "string" ? search.user_code.slice(0, 191) : "",
  }),
  head: () => ({ meta: [{ title: "授权登录 · Voidmix" }] }),
  component: AuthorizePage,
})

function AuthorizePage() {
  const { user_code } = Route.useSearch()
  return <AuthScreen authorize initialCode={user_code} />
}
