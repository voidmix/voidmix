export type DeviceClientId = "voidmix-mobile" | "voidmix-mobile-web" | "voidmix-desktop"

export interface DeviceGrant {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
  expiresAt: number
}

export interface NativeUser {
  id: string
  name: string
  email: string
  image?: string | null
}

async function authRequest(origin: string, path: string, init: RequestInit = {}) {
  return fetch(new URL(`/api/auth${path}`, origin), {
    ...init,
    // Device operations must not borrow the authorization browser's cookie session.
    credentials: "omit",
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15_000),
  })
}

export async function requestDeviceGrant(
  origin: string,
  clientId: DeviceClientId,
): Promise<DeviceGrant> {
  const response = await authRequest(origin, "/device/code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId }),
  })
  if (!response.ok) throw new Error("暂时无法发起登录，请稍后重试。")
  const grant = (await response.json()) as Omit<DeviceGrant, "expiresAt">
  return { ...grant, expiresAt: Date.now() + grant.expires_in * 1000 }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted()
    const abort = () => {
      clearTimeout(timer)
      reject(new Error("登录已取消。"))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, ms)
    signal.addEventListener("abort", abort, { once: true })
  })
}

/** Poll until approved, cancelled, denied, or expired, respecting server slow_down responses. */
export async function redeemDeviceGrant(
  origin: string,
  clientId: DeviceClientId,
  grant: DeviceGrant,
  signal: AbortSignal,
) {
  let interval = Math.max(grant.interval, 1) * 1000
  while (Date.now() < grant.expiresAt) {
    signal.throwIfAborted()
    const response = await authRequest(origin, "/device/token", {
      method: "POST",
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: grant.device_code,
        client_id: clientId,
      }),
    })
    const data = (await response.json()) as { access_token?: string; error?: string }
    if (response.ok && data.access_token) return data.access_token
    if (data.error === "slow_down") interval += 5_000
    else if (data.error !== "authorization_pending") {
      throw new Error(
        data.error === "access_denied" ? "本次登录未获授权。" : "授权已失效，请重新登录。",
      )
    }
    await wait(interval, signal)
  }
  throw new Error("授权已过期，请重新登录。")
}

export async function getNativeSession(origin: string, token: string): Promise<NativeUser | null> {
  const response = await authRequest(origin, "/get-session", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) return null
  if (!response.ok) throw new Error("无法读取登录状态，请稍后重试。")
  const session = (await response.json()) as { user: NativeUser } | null
  return session?.user ?? null
}

export async function revokeNativeSession(origin: string, token: string) {
  const response = await authRequest(origin, "/sign-out", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: "{}",
  })
  if (!response.ok && response.status !== 401) throw new Error("退出失败，请检查网络后重试。")
}
