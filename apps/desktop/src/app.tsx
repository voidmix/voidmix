import { isMyGo } from "mygo-runtime"
import { useState } from "react"

import { Button } from "@voidmix/ui/components/button"
import { Starter } from "@voidmix/ui/components/starter"
import { Greeter } from "./mygo.gen"
import { Account } from "./account"

export function App() {
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const native = isMyGo()

  async function greet() {
    setPending(true)
    try {
      setMessage(await Greeter.greet("Voidmix"))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "调用失败，请重试。")
    } finally {
      setPending(false)
    }
  }

  return (
    <Starter>
      <Account />
      <div className="w-full space-y-3 border-t pt-6">
        <Button variant="secondary" disabled={!native || pending} onClick={greet}>
          {pending ? "调用中…" : "调用 Go"}
        </Button>
        <p aria-live="polite" className="text-sm leading-relaxed text-muted-foreground">
          {message || (native ? "试试调用桌面端的 Go 服务。" : "请在桌面应用中体验 Go 调用。")}
        </p>
      </div>
    </Starter>
  )
}
