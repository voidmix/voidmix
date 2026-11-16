import { expect, test, type APIRequestContext } from "@playwright/test"
import { createApiClient } from "@voidmix/api/client"
import { apiOrigin, webOrigin } from "../environment"

const password = "Voidmix-device-password-2026!"
const grantType = "urn:ietf:params:oauth:grant-type:device_code"

async function register(request: APIRequestContext) {
  const email = `device-${crypto.randomUUID()}@example.com`
  const response = await request.post(`${webOrigin}/api/auth/sign-up/email`, {
    headers: { Origin: webOrigin },
    data: { name: "Device Tester", email, password },
  })
  expect(response.ok()).toBeTruthy()
  return email
}

async function grant(request: APIRequestContext, clientId = "voidmix-desktop") {
  const response = await request.post(`${apiOrigin}/api/auth/device/code`, {
    data: { client_id: clientId },
  })
  expect(response.status()).toBe(200)
  const data = await response.json()
  expect(data.verification_uri_complete).toContain(`${webOrigin}/authorize?user_code=`)
  expect(data.verification_uri_complete).not.toContain(data.device_code)
  return data
}

async function claim(request: APIRequestContext, userCode: string) {
  const response = await request.get(`${webOrigin}/api/auth/device`, {
    params: { user_code: userCode },
  })
  expect(response.status()).toBe(200)
}

test("Web 授权后原生 Bearer 会话可用、不可重复兑换，退出即失效", async ({ page, playwright }) => {
  const native = await playwright.request.newContext()
  try {
    const email = await register(page.request)
    const device = await grant(native)
    const anonymous = await native.post(`${apiOrigin}/api/auth/device/approve`, {
      data: { userCode: device.user_code },
    })
    expect(anonymous.status()).toBe(401)
    await page.goto(device.verification_uri_complete)
    await expect(page.getByText(email, { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "核对授权码" }).click()
    await expect(page.getByText("Voidmix 桌面端", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "允许登录" }).click()
    await expect(page.getByRole("heading", { name: "已允许登录" })).toBeVisible()
    const data = {
      grant_type: grantType,
      client_id: "voidmix-desktop",
      device_code: device.device_code,
    }
    const response = await native.post(`${apiOrigin}/api/auth/device/token`, { data })
    expect(response.status()).toBe(200)
    const { access_token: token } = await response.json()
    const headers = { Authorization: `Bearer ${token}` }
    expect(
      await (await native.get(`${apiOrigin}/api/auth/get-session`, { headers })).json(),
    ).toMatchObject({ user: { email } })
    const client = createApiClient(`${apiOrigin}/api/rpc`, {
      credentials: "omit",
      headers: () => new Headers(headers),
    })
    expect(await client.me()).toMatchObject({ email })
    expect((await native.post(`${apiOrigin}/api/auth/device/token`, { data })).status()).toBe(400)
    expect(
      (await native.post(`${apiOrigin}/api/auth/sign-out`, { headers, data: {} })).status(),
    ).toBe(200)
    expect(
      await (await native.get(`${apiOrigin}/api/auth/get-session`, { headers })).json(),
    ).toBeNull()
    await expect(client.me()).rejects.toMatchObject({ status: 401 })
    // The browser session remains independent of the device session.
    expect(
      await (await page.request.get(`${webOrigin}/api/auth/get-session`)).json(),
    ).toMatchObject({ user: { email } })
  } finally {
    await native.dispose()
  }
})

test("设备授权限制客户端、轮询频率和授权人，并支持拒绝", async ({ request, playwright }) => {
  const native = await playwright.request.newContext()
  const other = await playwright.request.newContext()
  try {
    expect(
      (
        await native.post(`${apiOrigin}/api/auth/device/code`, { data: { client_id: "unknown" } })
      ).status(),
    ).toBe(400)
    await register(request)
    await register(other)
    const device = await grant(native)
    const data = {
      grant_type: grantType,
      client_id: "voidmix-desktop",
      device_code: device.device_code,
    }
    const first = await native.post(`${apiOrigin}/api/auth/device/token`, { data })
    expect(await first.json()).toMatchObject({ error: "authorization_pending" })
    expect(
      await (await native.post(`${apiOrigin}/api/auth/device/token`, { data })).json(),
    ).toMatchObject({ error: "slow_down" })
    const denied = await grant(native, "voidmix-mobile")
    await claim(request, denied.user_code)
    const wrongOwner = await other.post(`${webOrigin}/api/auth/device/approve`, {
      headers: { Origin: webOrigin },
      data: { userCode: denied.user_code },
    })
    expect(wrongOwner.status()).toBe(403)
    expect(
      (
        await request.post(`${webOrigin}/api/auth/device/deny`, {
          headers: { Origin: webOrigin },
          data: { userCode: denied.user_code },
        })
      ).status(),
    ).toBe(200)
    expect(
      await (
        await native.post(`${apiOrigin}/api/auth/device/token`, {
          data: { ...data, client_id: "voidmix-mobile", device_code: denied.device_code },
        })
      ).json(),
    ).toMatchObject({ error: "access_denied" })
    const mismatch = await grant(native)
    expect(
      (
        await native.post(`${apiOrigin}/api/auth/device/token`, {
          data: { ...data, client_id: "voidmix-mobile", device_code: mismatch.device_code },
        })
      ).status(),
    ).toBe(400)
  } finally {
    await native.dispose()
    await other.dispose()
  }
})
