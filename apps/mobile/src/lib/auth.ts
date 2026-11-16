import { useSyncExternalStore } from "react"
import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import * as WebBrowser from "expo-web-browser"
import {
  getNativeSession,
  redeemDeviceGrant,
  requestDeviceGrant,
  revokeNativeSession,
  type NativeUser,
} from "@voidmix/auth/device"

import { getApiOrigin } from "./config"

const callbackURL = "voidmix://auth/complete"
type AuthState = { user: NativeUser | null; pending: boolean; code: string; error: string }
let state: AuthState = { user: null, pending: false, code: "", error: "" }
const listeners = new Set<() => void>()
let controller: AbortController | undefined
let initialized = false
let webToken: string | null = null

function update(change: Partial<AuthState>) {
  state = { ...state, ...change }
  listeners.forEach((notify) => notify())
}

export function useNativeAuth() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
    () => state,
    () => state,
  )
}

function storageKey() {
  // SecureStore restricts key characters; encode the full origin to isolate environments.
  return `voidmix.session.${Array.from(getApiOrigin(), (char) => char.charCodeAt(0).toString(16).padStart(4, "0")).join("")}`
}

export async function getSessionToken() {
  return Platform.OS === "web" ? webToken : SecureStore.getItemAsync(storageKey())
}

async function saveToken(token: string | null) {
  if (Platform.OS === "web") {
    // The browser preview deliberately keeps device tokens out of persistent Web storage.
    webToken = token
    return
  }
  if (token)
    await SecureStore.setItemAsync(storageKey(), token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })
  else await SecureStore.deleteItemAsync(storageKey())
}

export async function restoreSession() {
  if (initialized || controller) return
  initialized = true
  update({ pending: true, error: "" })
  try {
    const token = await getSessionToken()
    const user = token ? await getNativeSession(getApiOrigin(), token) : null
    if (token && !user) await saveToken(null)
    update({ user })
  } catch {
    initialized = false
    update({ error: "无法恢复登录状态，请检查网络后重试。" })
  } finally {
    update({ pending: false })
  }
}

export async function signInWithWeb() {
  if (state.pending) return
  // Open synchronously so browsers treat this as a user gesture.
  const popup =
    Platform.OS === "web"
      ? window.open("about:blank", "_blank", "popup,width=480,height=720")
      : null
  const attempt = new AbortController()
  controller = attempt
  let closeTimer: ReturnType<typeof setInterval> | undefined
  let token: string | undefined
  update({ pending: true, error: "", code: "" })
  try {
    if (Platform.OS === "web" && !popup) throw new Error("登录窗口被拦截，请允许弹出窗口后重试。")
    if (popup) popup.opener = null
    const origin = getApiOrigin()
    const clientId = Platform.OS === "web" ? "voidmix-mobile-web" : "voidmix-mobile"
    const grant = await requestDeviceGrant(origin, clientId)
    attempt.signal.throwIfAborted()
    update({ code: grant.user_code })
    if (popup) {
      popup.location.href = grant.verification_uri_complete
      closeTimer = setInterval(() => {
        if (popup.closed) attempt.abort()
      }, 400)
    } else {
      const result = await WebBrowser.openAuthSessionAsync(
        grant.verification_uri_complete,
        callbackURL,
      )
      if (result.type !== "success") throw new Error("登录已取消。")
      const callback = new URL(result.url)
      if (
        `${callback.protocol}//${callback.host}${callback.pathname}` !== callbackURL ||
        callback.searchParams.get("user_code") !== grant.user_code
      ) {
        throw new Error("授权回调不匹配，请重新登录。")
      }
    }
    token = await redeemDeviceGrant(origin, clientId, grant, attempt.signal)
    const user = await getNativeSession(origin, token)
    if (!user) throw new Error("会话已失效，请重新登录。")
    attempt.signal.throwIfAborted()
    await saveToken(token)
    if (attempt.signal.aborted) {
      // Cancellation can race the SecureStore write; roll it back before publishing state.
      await saveToken(null)
      throw new Error("登录已取消。")
    }
    initialized = true
    update({ user })
    token = undefined
  } catch (cause) {
    if (token) await revokeNativeSession(getApiOrigin(), token).catch(() => {})
    update({
      error: attempt.signal.aborted
        ? "登录已取消。"
        : cause instanceof Error
          ? cause.message
          : "登录失败，请重试。",
    })
  } finally {
    if (closeTimer) clearInterval(closeTimer)
    popup?.close()
    controller = undefined
    update({ pending: false, code: "" })
  }
}

export function cancelSignIn() {
  controller?.abort()
  if (Platform.OS === "ios") WebBrowser.dismissAuthSession()
}

export async function signOut() {
  if (state.pending) return
  update({ pending: true, error: "" })
  try {
    const token = await getSessionToken()
    if (token) await revokeNativeSession(getApiOrigin(), token)
    await saveToken(null)
    update({ user: null })
  } catch {
    update({ error: "退出失败，请检查网络后重试。" })
  } finally {
    update({ pending: false })
  }
}
