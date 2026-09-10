import { expect, it, vi } from 'vitest'
import { createBridgeFetch, type DesktopBridge } from './index'
it('keeps privileged requests within the configured API', async () => {
  const bridge: DesktopBridge = {
    kind: 'electron',
    request: vi.fn(async () => ({ status: 200, body: '{}' })),
    openExternal: vi.fn(),
    saveCredential: vi.fn(),
    clearCredential: vi.fn(),
  }
  const request = createBridgeFetch(bridge, 'https://api.example')
  await expect(request('https://attacker.example/api/auth/get-session')).rejects.toThrow()
  await expect(request('https://api.example/admin')).rejects.toThrow()
  expect(bridge.request).not.toHaveBeenCalled()
  await request('https://api.example/api/rpc/me', { method: 'POST', body: '{}' })
  expect(bridge.request).toHaveBeenCalledWith({ path: '/api/rpc/me', method: 'POST', body: '{}' })
})
