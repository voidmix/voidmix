import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { fileSchema, uploadInput } from '@voidmix/contracts'
import type { ApiClient } from './index'
export interface ClientOptions {
  baseUrl: string
  fetch?: typeof globalThis.fetch
  getToken?: () => Promise<string | undefined>
}
export function createApiClient(options: ClientOptions) {
  return createORPCClient<ApiClient>(
    new RPCLink({
      url: () => {
        const base =
          options.baseUrl || (typeof window !== 'undefined' ? window.location.origin : undefined)
        if (!base) throw new Error('API base URL is required on the server')
        return new URL('/api/rpc', base)
      },
      headers: async () => {
        const token = await options.getToken?.()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
      fetch: (request, init) =>
        (options.fetch ?? fetch)(request, {
          ...init,
          credentials: options.getToken ? 'omit' : 'include',
        }),
    }),
  )
}
export function createFileActions(
  options: ClientOptions & { openUrl: (url: string) => void | Promise<void> },
) {
  const rpc = createApiClient(options)
  async function request(path: string, body?: unknown, method = 'POST') {
    const token = await options.getToken?.()
    const response = await (options.fetch ?? fetch)(`${options.baseUrl}/api/files/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: token ? 'omit' : 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.status === 204) return undefined
    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message ?? 'Request failed')
    return data
  }
  return {
    list: (cursor?: string) => rpc.files.list({ limit: 20, sort: 'newest', cursor }),
    async upload(file: File) {
      const input = uploadInput.parse({
        fileName: file.name,
        size: file.size,
        contentType: file.type,
      })
      const init = await request('init', input)
      // Use the browser for direct object uploads; no API cookies or bearer tokens go to storage.
      const uploaded = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: init.headers,
        body: file,
        credentials: 'omit',
      })
      if (!uploaded.ok) throw new Error('文件上传失败，请重新选择文件')
      fileSchema.parse(await request('complete', { id: init.file.id }))
    },
    async download(id: string) {
      const data = await request('download', { id })
      await options.openUrl(data.url)
    },
    async remove(id: string) {
      await request(encodeURIComponent(id), undefined, 'DELETE')
    },
  }
}
export type { ApiClient }
