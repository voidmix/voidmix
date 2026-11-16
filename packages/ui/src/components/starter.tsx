import { useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@voidmix/ui/components/button"

export function Starter({ children }: { children?: ReactNode }) {
  const [count, setCount] = useState(0)

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-start gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Voidmix</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            项目已就绪，从这里开始构建。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setCount((value) => value + 1)}>
            点击计数 <span aria-live="polite">{count}</span>
          </Button>
          <Button variant="outline" disabled={count === 0} onClick={() => setCount(0)}>
            重置
          </Button>
        </div>
        {children}
      </div>
    </main>
  )
}
