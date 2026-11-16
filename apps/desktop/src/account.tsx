import { useEffect, useRef, useState } from "react"
import { isMyGo } from "mygo-runtime"
import { Button } from "@voidmix/ui/components/button"
import { NativeAuth, type NativeUser } from "./mygo.gen"

const apiOrigin = import.meta.env.VITE_API_URL || "http://127.0.0.1:3002"
type Attempt = { id: string; canceled: boolean }

export function Account() {
  const [user, setUser] = useState<NativeUser | null>(null)
  const [busy, setBusy] = useState(() => isMyGo())
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const attempt = useRef<Attempt | null>(null)
  const native = isMyGo()

  useEffect(() => {
    let disposed = false
    if (native) {
      NativeAuth.session(apiOrigin)
        .then((profile) => {
          if (!disposed) setUser(profile)
        })
        .catch(() => {
          if (!disposed) setError("无法恢复登录状态，请检查网络与系统钥匙串后重试。")
        })
        .finally(() => {
          if (!disposed) setBusy(false)
        })
    }
    return () => {
      disposed = true
      const current = attempt.current
      if (current) {
        current.canceled = true
        if (current.id) void NativeAuth.cancelLogin(current.id)
      }
    }
  }, [native])

  async function login() {
    const current: Attempt = { id: "", canceled: false }
    attempt.current = current
    setBusy(true)
    setError("")
    try {
      const grant = await NativeAuth.startLogin(apiOrigin)
      if (!grant) throw new Error("无法打开登录窗口，请重试。")
      current.id = grant.id
      if (current.canceled) {
        await NativeAuth.cancelLogin(grant.id)
        return
      }
      setCode(grant.userCode)
      let interval = grant.interval
      while (!current.canceled) {
        await new Promise((resolve) => setTimeout(resolve, interval * 1000))
        if (current.canceled) return
        const result = await NativeAuth.pollLogin(grant.id)
        if (!result) throw new Error("登录已取消，请重试。")
        if (result.user) {
          setUser(result.user)
          return
        }
        interval = result.interval
      }
    } catch (cause) {
      if (!current.canceled) setError(cause instanceof Error ? cause.message : "登录失败，请重试。")
    } finally {
      if (attempt.current === current) {
        attempt.current = null
        setBusy(false)
        setCode("")
      }
    }
  }

  async function cancel() {
    const current = attempt.current
    if (!current) return
    current.canceled = true
    if (current.id) await NativeAuth.cancelLogin(current.id)
    attempt.current = null
    setBusy(false)
    setCode("")
    setError("登录已取消。")
  }

  async function logout() {
    setBusy(true)
    setError("")
    try {
      await NativeAuth.signOut(apiOrigin)
      setUser(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "退出失败，请重试。")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full space-y-3 border-t pt-6">
      <p className="text-sm leading-6 break-words">
        {user ? `${user.name} · ${user.email}` : "登录后，在不同设备上使用你的账户。"}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          className="h-10 px-4"
          variant="outline"
          disabled={!native || busy}
          onClick={user ? logout : login}
        >
          {busy ? "正在处理…" : user ? "退出登录" : "打开网页登录"}
        </Button>
        {code && (
          <Button className="h-10 px-4" variant="ghost" onClick={cancel}>
            取消登录
          </Button>
        )}
      </div>
      {code && (
        <output className="block text-sm leading-6 text-muted-foreground">
          请在登录窗口核对授权码：<span className="font-mono tabular-nums">{code}</span>
        </output>
      )}
      {!native && <p className="text-sm text-muted-foreground">请在桌面应用中登录。</p>}
      {error && (
        <p role="alert" className="text-sm leading-6 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
