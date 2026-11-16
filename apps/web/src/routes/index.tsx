import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@voidmix/ui/components/button"
import { Starter } from "@voidmix/ui/components/starter"

import { orpc } from "@/lib/orpc"

export const Route = createFileRoute("/")({
  loader: () => orpc.greet({ name: "Voidmix" }),
  component: App,
})

function App() {
  const initial = Route.useLoaderData()
  const [message, setMessage] = useState(initial.message)
  const [pending, setPending] = useState(false)

  async function greet() {
    setPending(true)
    try {
      const result = await orpc.greet({ name: "Voidmix" })
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "调用失败，请重试。")
    } finally {
      setPending(false)
    }
  }

  return (
    <Starter>
      <div className="w-full space-y-3 border-t pt-6">
        <Button variant="outline" render={<Link to="/login" />}>
          登录账户
        </Button>
        <Button variant="secondary" disabled={pending} onClick={greet}>
          {pending ? "调用中…" : "调用 oRPC"}
        </Button>
        <p aria-live="polite" className="text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>
    </Starter>
  )
}
