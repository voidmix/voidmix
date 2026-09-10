export interface NativeResponse {
  status: number
  body: string
  headers?: Record<string, string>
}
export interface DesktopBridge {
  readonly kind: 'electron' | 'tauri' | 'browser-preview'
  request(input: { path: string; method: string; body?: string }): Promise<NativeResponse>
  openExternal(url: string): Promise<void>
  saveCredential(value: string): Promise<void>
  clearCredential(): Promise<void>
}
export function createBridgeFetch(bridge: DesktopBridge, apiUrl: string): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.origin !== new URL(apiUrl).origin || !url.pathname.startsWith('/api/'))
      throw new Error('API request is outside the configured server')
    const response = await bridge.request({
      path: url.pathname + url.search,
      method: request.method,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
    })
    return new Response(response.status === 204 ? null : response.body, {
      status: response.status,
      headers: response.headers ?? { 'Content-Type': 'application/json' },
    })
  }
}
export async function authorizeDesktop(
  bridge: DesktopBridge,
  signal: AbortSignal,
  showCode: (code: string) => void,
) {
  const start = await bridge.request({
    path: '/api/auth/device/code',
    method: 'POST',
    body: JSON.stringify({ client_id: 'voidmix-desktop' }),
  })
  if (start.status !== 200) throw new Error('无法开始设备登录')
  const data = JSON.parse(start.body) as {
    device_code: string
    user_code: string
    verification_uri_complete: string
    expires_in: number
    interval: number
  }
  showCode(data.user_code)
  await bridge.openExternal(data.verification_uri_complete)
  const expires = Date.now() + data.expires_in * 1000
  let interval = data.interval * 1000
  while (Date.now() < expires) {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer)
        reject(new DOMException('Cancelled', 'AbortError'))
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort)
        resolve()
      }, interval)
      if (signal.aborted) abort()
      else signal.addEventListener('abort', abort, { once: true })
    })
    const result = await bridge.request({
      path: '/api/auth/device/token',
      method: 'POST',
      body: JSON.stringify({
        client_id: 'voidmix-desktop',
        device_code: data.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })
    const body = JSON.parse(result.body)
    if (result.status === 200 && typeof body.access_token === 'string') {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      await bridge.saveCredential(body.access_token)
      return
    }
    if (body.error === 'slow_down') interval += 5000
    else if (body.error !== 'authorization_pending')
      throw new Error(body.error_description ?? '设备授权失败')
  }
  throw new Error('设备码已过期，请重新登录')
}
