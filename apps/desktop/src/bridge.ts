import type { DesktopBridge } from '@voidmix/desktop-bridge'
import { invoke } from '@tauri-apps/api/core'
declare global {
  interface Window {
    electronBridge?: Omit<DesktopBridge, 'kind'>
    __TAURI_INTERNALS__?: unknown
  }
}
export function createDesktopBridge(apiUrl: string): DesktopBridge {
  if (window.electronBridge) return { kind: 'electron', ...window.electronBridge }
  if (window.__TAURI_INTERNALS__)
    return {
      kind: 'tauri',
      request: (input) => invoke('api_request', { input }),
      openExternal: (url) => invoke('open_external', { url }),
      saveCredential: (value) => invoke('save_credential', { value }),
      clearCredential: () => invoke('clear_credential'),
    }
  let token: string | undefined
  return {
    kind: 'browser-preview',
    async request(input) {
      const response = await fetch(`${apiUrl}${input.path}`, {
        method: input.method,
        body: input.body,
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      return { status: response.status, body: await response.text() }
    },
    async openExternal(url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    async saveCredential(value) {
      token = value
    },
    async clearCredential() {
      token = undefined
    },
  }
}
