import { createRoot } from 'react-dom/client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { parseDesktopConfig } from '@voidmix/config/desktop'
import { authorizeDesktop, createBridgeFetch } from '@voidmix/desktop-bridge'
import { createFileActions } from '@voidmix/rpc/client'
import { Brand, BrandMark, Button, FileWorkspace, Notice } from '@voidmix/ui'
import '@voidmix/ui/styles.css'
import { createDesktopBridge } from './bridge'
const config = parseDesktopConfig({
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
})
const bridge = createDesktopBridge(config.apiUrl)
function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const actions = useMemo(
    () =>
      createFileActions({
        baseUrl: config.apiUrl,
        fetch: createBridgeFetch(bridge, config.apiUrl),
        openUrl: (url) => bridge.openExternal(url),
      }),
    [],
  )
  useEffect(() => {
    void bridge
      .request({ path: '/api/auth/get-session', method: 'GET' })
      .then((result) => setAuthenticated(Boolean(JSON.parse(result.body)?.user)))
      .catch(() => setError('暂时无法连接服务器'))
    return () => {
      controller.current?.abort()
    }
  }, [])
  async function login() {
    setBusy(true)
    setError('')
    controller.current = new AbortController()
    try {
      await authorizeDesktop(bridge, controller.current.signal, setCode)
      setAuthenticated(true)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setError(error instanceof Error ? error.message : '登录失败')
    } finally {
      setBusy(false)
      setCode('')
    }
  }
  async function logout() {
    try {
      await bridge.request({ path: '/api/auth/sign-out', method: 'POST', body: '{}' })
    } finally {
      await bridge.clearCredential()
      setAuthenticated(false)
    }
  }
  return (
    <>
      <header className="topbar">
        <Brand desktop />
        {authenticated && (
          <Button variant="outline" onClick={() => void logout()}>
            退出登录
          </Button>
        )}
      </header>
      <main id="main" className="shell">
        {bridge.kind === 'browser-preview' && (
          <Notice>浏览器预览：登录仅在本次页面会话中保留。</Notice>
        )}
        {error && <Notice error>{error}</Notice>}
        {authenticated ? (
          <FileWorkspace actions={actions} />
        ) : (
          <section className="auth">
            <BrandMark />
            <h1>连接你的账号</h1>
            <p>在浏览器中确认登录，然后回到桌面应用。</p>
            {code && <p className="device-code">{code}</p>}
            <div className="actions">
              <Button disabled={busy} onClick={() => void login()}>
                {busy ? '等待浏览器授权…' : '打开浏览器登录'}
              </Button>
              {busy && (
                <Button variant="outline" onClick={() => controller.current?.abort()}>
                  取消登录
                </Button>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
