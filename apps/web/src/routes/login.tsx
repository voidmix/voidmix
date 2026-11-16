import { createFileRoute } from "@tanstack/react-router"
import { AuthScreen } from "@/components/auth-screen"

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "登录 · Voidmix" }] }),
  component: AuthScreen,
})
