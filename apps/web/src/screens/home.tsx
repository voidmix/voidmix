import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { authClient } from '@voidmix/auth/client'
import { createFileActions } from '@voidmix/rpc/client'
import Bowser from 'bowser'
import { ArrowRight, Files, LogOut, Monitor, ShieldCheck, Smartphone } from 'lucide-react'
import {
  Brand,
  BrandMark,
  Button,
  Field,
  Input,
  FileWorkspace,
  Notice,
  PasswordInput,
  Skeleton,
} from '@voidmix/ui'
export function Home({ children }: { children?: ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession()
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [github, setGithub] = useState(false)
  const actions = useMemo(
    () =>
      createFileActions({
        baseUrl: '',
        openUrl: (url) => {
          window.location.assign(url)
        },
      }),
    [],
  )
  useEffect(() => {
    void fetch('/api/config')
      .then((response) => response.json())
      .then((config) => setGithub(config.githubEnabled))
      .catch(() => {})
  }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email'))
    const password = String(data.get('password'))
    try {
      const result = register
        ? await authClient.signUp.email({
            email,
            password,
            name: String(data.get('name')),
            callbackURL: window.location.pathname + window.location.search,
          })
        : await authClient.signIn.email({ email, password })
      if (result.error) setError(result.error.message ?? '登录失败')
      else if (register) setMessage('验证邮件已发送，请打开邮件完成注册。')
      else await refetch()
    } catch {
      setError('暂时无法连接，请稍后重试')
    } finally {
      setBusy(false)
    }
  }
  async function resend(form: HTMLFormElement) {
    setBusy(true)
    try {
      const email = String(new FormData(form).get('email'))
      if (!email) {
        setError('请先填写邮箱')
        return
      }
      const result = await authClient.sendVerificationEmail({ email, callbackURL: '/' })
      if (result.error) setError(result.error.message ?? '发送失败')
      else setMessage('验证邮件已发送。')
    } catch {
      setError('暂时无法发送验证邮件，请稍后重试')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <header className="topbar">
        <a className="brand-link" href="/">
          <Brand />
        </a>
        {session && !children && (
          <nav className="workspace-nav" aria-label="个人空间">
            <a href="#files-title">
              <Files aria-hidden="true" />
              文件
            </a>
            <a href="#sessions-title">
              <Monitor aria-hidden="true" />
              登录设备
            </a>
          </nav>
        )}
        {session && (
          <div className="account">
            <span className="account-avatar" aria-hidden="true">
              {session.user.name.slice(0, 1)}
            </span>
            <span className="account-name">{session.user.name}</span>
            <Button variant="ghost" onClick={() => void authClient.signOut().then(() => refetch())}>
              <LogOut aria-hidden="true" />
              退出登录
            </Button>
          </div>
        )}
        {!session && <span className="account-name">你的个人空间</span>}
      </header>
      <main id="main" className="shell">
        {isPending ? (
          <div className="auth" role="status">
            <span className="sr-only">正在读取登录状态…</span>
            <Skeleton className="h-12 w-12 mb-6" />
            <Skeleton className="h-10 w-64 mb-6" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : session ? (
          <>
            {children ?? (
              <>
                <FileWorkspace actions={actions} />
                <Sessions onSessionChange={() => void refetch()} />
              </>
            )}
          </>
        ) : (
          <section className="auth">
            <BrandMark />
            <h1>{register ? '创建你的账号' : '登录 Voidmix'}</h1>
            <p>{register ? '给你的文件，一个自己的空间。' : '欢迎回来，你的文件在这里等你。'}</p>
            <form onSubmit={(event) => void submit(event)}>
              {register && (
                <Field label="名字">
                  <Input name="name" required autoComplete="name" />
                </Field>
              )}
              <Field label="邮箱">
                <Input name="email" type="email" required autoComplete="email" />
              </Field>
              <Field label="密码">
                <PasswordInput
                  name="password"
                  minLength={12}
                  required
                  autoComplete={register ? 'new-password' : 'current-password'}
                  aria-describedby="password-help"
                />
              </Field>
              <small id="password-help">至少 12 个字符</small>
              <Button className="auth-submit" disabled={busy}>
                {busy ? '正在处理…' : register ? '注册账号' : '登录账号'}
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="auth-resend"
                disabled={busy}
                onClick={(event) => {
                  const form = event.currentTarget.form
                  if (form) void resend(form)
                }}
              >
                重新发送验证邮件
              </Button>
            </form>
            {error && <Notice error>{error}</Notice>}
            {message && <Notice success>{message}</Notice>}
            <div className="auth-footer">
              <Button
                variant="link"
                className="px-0"
                onClick={() => {
                  setRegister(!register)
                  setError('')
                  setMessage('')
                }}
              >
                {register ? '已有账号，去登录' : '创建账号'}
              </Button>
              <a href="/reset-password">忘记密码</a>
            </div>
            {github && (
              <Button
                variant="outline"
                className="auth-provider"
                disabled={busy}
                onClick={() =>
                  void authClient.signIn.social({
                    provider: 'github',
                    callbackURL: window.location.pathname + window.location.search,
                  })
                }
              >
                使用 GitHub 登录
              </Button>
            )}
          </section>
        )}
      </main>
    </>
  )
}
function Sessions({ onSessionChange }: { onSessionChange: () => void }) {
  const [sessions, setSessions] = useState<
    { token: string; userAgent?: string | null; createdAt: Date }[]
  >([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string>()
  async function load() {
    try {
      const result = await authClient.listSessions()
      if (result.error) setError('无法读取设备列表')
      else setSessions(result.data ?? [])
    } catch {
      setError('无法读取设备列表')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  return (
    <section className="sessions" aria-labelledby="sessions-title">
      <div className="sessions-heading">
        <ShieldCheck aria-hidden="true" />
        <h2 id="sessions-title">登录设备</h2>
      </div>
      {error && <Notice error>{error}</Notice>}
      {loading && (
        <div role="status">
          <span className="sr-only">正在读取设备…</span>
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      <ul className="session-list">
        {sessions.map((session) => {
          const agent = Bowser.parse(session.userAgent || '')
          const Icon = agent.platform.type === 'mobile' ? Smartphone : Monitor
          return (
            <li key={session.token}>
              <Icon className="session-icon" aria-hidden="true" />
              <div className="session-details">
                <strong>
                  {[agent.browser.name, agent.os.name].filter(Boolean).join(' · ') ||
                    '桌面或其他设备'}
                </strong>
                <p>{new Date(session.createdAt).toLocaleString()} 登录</p>
              </div>
              <Button
                variant="ghost"
                disabled={Boolean(revoking)}
                onClick={async () => {
                  setRevoking(session.token)
                  setError('')
                  try {
                    const result = await authClient.revokeSession({ token: session.token })
                    if (result.error) setError('撤销失败，请重试')
                    else {
                      await load()
                      onSessionChange()
                    }
                  } catch {
                    setError('撤销失败，请重试')
                  } finally {
                    setRevoking(undefined)
                  }
                }}
              >
                <LogOut aria-hidden="true" />
                {revoking === session.token ? '正在撤销…' : '撤销登录'}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
