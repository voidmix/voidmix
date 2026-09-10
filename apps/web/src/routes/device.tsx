import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Home } from '../screens/home'
import { BrandMark, Button, Field, Input, Notice } from '@voidmix/ui'
export const Route = createFileRoute('/device')({
  validateSearch: z.object({ user_code: z.string().optional() }),
  component: Device,
})
function Device() {
  const { user_code } = Route.useSearch()
  const [code, setCode] = useState(user_code ?? '')
  const [verified, setVerified] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function action(approve?: boolean) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(
        approve === undefined
          ? `/api/auth/device?user_code=${encodeURIComponent(code)}`
          : `/api/auth/device/${approve ? 'approve' : 'deny'}`,
        approve === undefined
          ? {}
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userCode: code }),
            },
      )
      if (!response.ok) throw new Error('设备码无效、已处理或已过期')
      if (approve === undefined) setVerified(true)
      else {
        setMessage(approve ? '已授权，请返回桌面应用。' : '已拒绝这次登录。')
        setVerified(false)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '授权失败')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Home>
      <section className="auth">
        <BrandMark />
        <h1>连接桌面应用</h1>
        <p>请核对桌面应用显示的设备码。只授权你自己发起的登录。</p>
        <Field label="设备码">
          <Input
            disabled={busy}
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setVerified(false)
            }}
          />
        </Field>
        <div className="actions">
          {verified ? (
            <>
              <Button disabled={busy} onClick={() => void action(true)}>
                授权 Voidmix Desktop
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void action(false)}>
                拒绝登录
              </Button>
            </>
          ) : (
            <Button disabled={busy || !code} onClick={() => void action()}>
              核对设备码
            </Button>
          )}
        </div>
        {message && <Notice>{message}</Notice>}
        {error && <Notice error>{error}</Notice>}
      </section>
    </Home>
  )
}
