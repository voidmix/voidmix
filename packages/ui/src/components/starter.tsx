import { useState } from "react"
import type { ReactNode } from "react"

import { AppShell, Surface } from "@voidmix/ui/components/app-shell"
import { Button } from "@voidmix/ui/components/button"
import { Logo } from "@voidmix/ui/components/logo"

export function Starter({ children }: { children?: ReactNode }) {
  const [count, setCount] = useState(0)

  return (
    <AppShell>
      <div className="flex w-full max-w-md flex-col gap-9">
        <div className="flex items-center gap-4">
          <Logo className="size-11" />
          <div className="space-y-2">
            <h1 className="text-3xl leading-none font-semibold tracking-tight">Voidmix</h1>
            <p className="text-sm leading-6 text-muted-foreground">项目已就绪，从这里开始构建。</p>
          </div>
        </div>
        <Surface className="flex flex-col items-start gap-6">
          <div className="flex items-center gap-3">
            <Button className="h-10 px-4" onClick={() => setCount((value) => value + 1)}>
              点击计数{" "}
              <span aria-live="polite" className="font-mono tabular-nums">
                {count}
              </span>
            </Button>
            <Button
              className="h-10 px-4"
              variant="outline"
              disabled={count === 0}
              onClick={() => setCount(0)}
            >
              重置
            </Button>
          </div>
          {children}
        </Surface>
      </div>
    </AppShell>
  )
}
