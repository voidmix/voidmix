import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { authClient } from '@voidmix/auth/client'
import { BrandMark, Button, Field, Input, Notice, PasswordInput } from '@voidmix/ui'
export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({ token: z.string().optional() }),
  component: ResetPassword,
})
function ResetPassword() {
  const { token } = Route.useSearch()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = token
        ? await authClient.resetPassword({ token, newPassword: String(data.get('password')) })
        : await authClient.requestPasswordReset({
            email: String(data.get('email')),
            redirectTo: '/reset-password',
          })
      if (result.error) setError(result.error.message ?? '操作失败')
      else
        setMessage(
          token ? '密码已更新，可以重新登录。' : '如果账号存在，重置邮件会发送到你的邮箱。',
        )
    } catch {
      setError('暂时无法连接')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main id="main" className="shell">
      <section className="auth">
        <BrandMark />
        <h1>重置密码</h1>
        <form onSubmit={(event) => void submit(event)}>
          {token ? (
            <Field label="新密码">
              <PasswordInput name="password" required minLength={12} autoComplete="new-password" />
            </Field>
          ) : (
            <Field label="邮箱">
              <Input type="email" name="email" required autoComplete="email" />
            </Field>
          )}
          <Button disabled={busy}>{token ? '更新密码' : '发送重置邮件'}</Button>
        </form>
        {message && <Notice>{message}</Notice>}
        {error && <Notice error>{error}</Notice>}
        <a href="/">返回登录</a>
      </section>
    </main>
  )
}
