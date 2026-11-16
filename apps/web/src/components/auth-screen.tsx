import { useState, type FormEvent } from "react"
import { Button } from "@voidmix/ui/components/button"
import { Input } from "@voidmix/ui/components/input"
import { Label } from "@voidmix/ui/components/label"

import { authClient } from "@/lib/auth"

const clientNames: Record<string, string> = {
  "voidmix-mobile": "Voidmix 移动端",
  "voidmix-mobile-web": "Voidmix 移动端网页版",
  "voidmix-desktop": "Voidmix 桌面端",
}

export function AuthScreen({ authorize = false, initialCode = "" }) {
  const { data: session, isPending, error: sessionError, refetch } = authClient.useSession()
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [code, setCode] = useState(initialCode)
  const [device, setDevice] = useState<{ code: string; clientId: string } | null>(null)
  const [outcome, setOutcome] = useState<"approved" | "denied" | null>(null)

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      const credentials = {
        email: String(form.get("email")),
        password: String(form.get("password")),
      }
      const result = register
        ? await authClient.signUp.email({ ...credentials, name: String(form.get("name")) })
        : await authClient.signIn.email(credentials)
      if (result.error)
        throw new Error(
          register ? "注册失败，请检查邮箱是否已注册后重试。" : "邮箱或密码不正确，请重试。",
        )
      await refetch()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "连接失败，请稍后重试。")
    } finally {
      setBusy(false)
    }
  }

  async function inspectCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const normalized = code.trim().toUpperCase()
      const result = await authClient.device({ query: { user_code: normalized } })
      if (result.error || !result.data || result.data.status !== "pending") {
        throw new Error("授权码无效或已过期，请回到应用重新发起登录。")
      }
      const clientId = result.data.client_id ?? ""
      if (!clientNames[clientId]) throw new Error("无法识别此应用，请重新发起登录。")
      setDevice({ code: normalized, clientId })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "连接失败，请重试。")
    } finally {
      setBusy(false)
    }
  }

  async function decide(approve: boolean) {
    if (!device) return
    setBusy(true)
    setError("")
    try {
      const result = approve
        ? await authClient.device.approve({ userCode: device.code })
        : await authClient.device.deny({ userCode: device.code })
      if (result.error) throw new Error("授权已失效，请回到应用重新发起登录。")
      setOutcome(approve ? "approved" : "denied")
      if (device.clientId === "voidmix-mobile") {
        window.location.assign(
          `voidmix://auth/complete?user_code=${encodeURIComponent(device.code)}`,
        )
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "连接失败，请重试。")
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    setError("")
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error("退出失败，请稍后重试。")
      setDevice(null)
      await refetch()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "连接失败，请重试。")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12 selection:bg-primary selection:text-primary-foreground">
      <div className="w-full max-w-sm space-y-8">
        <a
          href="/"
          className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Voidmix
        </a>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {outcome
              ? outcome === "approved"
                ? "已允许登录"
                : "已拒绝登录"
              : authorize && session
                ? "授权应用登录"
                : register
                  ? "创建账户"
                  : "登录 Voidmix"}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {outcome
              ? "可以返回应用，关闭此页面。"
              : authorize
                ? "登录后，核对应用中的授权码并确认登录。"
                : "使用邮箱和密码登录你的账户。"}
          </p>
        </div>

        {isPending ? (
          <output className="block text-sm text-muted-foreground">正在读取登录状态…</output>
        ) : outcome ? (
          device?.clientId === "voidmix-mobile" && (
            <a
              className="inline-flex min-h-11 items-center underline underline-offset-4"
              href={`voidmix://auth/complete?user_code=${encodeURIComponent(device.code)}`}
            >
              返回移动应用
            </a>
          )
        ) : session ? (
          <div className="space-y-6">
            <div className="space-y-1 border-b pb-5">
              <p className="font-medium break-words">{session.user.name}</p>
              <p className="text-sm break-all text-muted-foreground">{session.user.email}</p>
            </div>
            {authorize && !device && (
              <form onSubmit={inspectCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-code">应用中的授权码</Label>
                  <Input
                    id="device-code"
                    name="user_code"
                    className="h-11 font-mono text-base uppercase tabular-nums md:text-base"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    required
                    maxLength={191}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <Button className="h-11 w-full" disabled={busy} type="submit">
                  {busy ? "正在核对…" : "核对授权码"}
                </Button>
              </form>
            )}
            {authorize && device && (
              <div className="space-y-5">
                <p className="text-sm leading-6">
                  <strong>{clientNames[device.clientId]}</strong>{" "}
                  请求使用此账户登录。请确认这是你刚刚发起的操作，且下方授权码与应用中一致。
                </p>
                <p
                  className="rounded-lg bg-muted px-4 py-5 text-center font-mono text-2xl tracking-widest break-all tabular-nums"
                  aria-label={`授权码 ${device.code}`}
                >
                  {device.code}
                </p>
                <div className="flex gap-3">
                  <Button
                    className="h-11 flex-1"
                    variant="outline"
                    disabled={busy}
                    onClick={() => decide(false)}
                  >
                    拒绝
                  </Button>
                  <Button className="h-11 flex-1" disabled={busy} onClick={() => decide(true)}>
                    {busy ? "正在处理…" : "允许登录"}
                  </Button>
                </div>
              </div>
            )}
            <Button variant="link" className="h-11 p-0" disabled={busy} onClick={signOut}>
              {authorize ? "换个账户登录" : "退出登录"}
            </Button>
          </div>
        ) : (
          <form onSubmit={submitAccount} className="space-y-5">
            {register && (
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input
                  className="h-11 md:text-base"
                  id="name"
                  name="name"
                  required
                  autoComplete="name"
                  maxLength={100}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                className="h-11 md:text-base"
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                className="h-11 md:text-base"
                id="password"
                name="password"
                type="password"
                required
                minLength={register ? 12 : 1}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                aria-describedby={register ? "password-hint" : undefined}
              />
              {register && (
                <p id="password-hint" className="text-sm text-muted-foreground">
                  至少 12 个字符。
                </p>
              )}
            </div>
            <Button className="h-11 w-full" type="submit" disabled={busy || !!sessionError}>
              {busy ? "正在提交…" : register ? "创建账户" : "登录"}
            </Button>
            <Button
              className="h-11 w-full"
              variant="ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                setRegister(!register)
                setError("")
              }}
            >
              {register ? "已有账户，去登录" : "没有账户，创建一个"}
            </Button>
          </form>
        )}
        {(error || sessionError) && (
          <p role="alert" className="text-sm leading-6 text-destructive">
            {error || "无法读取登录状态，请检查网络并刷新页面。"}
          </p>
        )}
      </div>
    </main>
  )
}
