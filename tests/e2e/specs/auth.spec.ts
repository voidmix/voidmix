import { expect, test } from "@playwright/test"
import { createApiClient } from "@voidmix/api/client"
import type { APIRequestContext } from "@playwright/test"

import { apiOrigin, mobileOrigin, webOrigin } from "../environment"

async function sessionCookie(request: APIRequestContext) {
  const { cookies } = await request.storageState()
  const cookie = cookies.find((value) => value.name.endsWith("session_token"))
  expect(cookie).toBeDefined()
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie?.sameSite).toBe("Lax")
  return `${cookie?.name}=${cookie?.value}`
}

for (const [name, origin] of [
  ["独立 API", apiOrigin],
  ["Web 代理", webOrigin],
] as const) {
  test.describe(`${name}认证`, () => {
    test("未登录无法访问 me", async () => {
      const client = createApiClient(`${origin}/api/rpc`)
      await expect(client.me()).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 })
    })

    test("注册、会话、退出撤销与重新登录", async ({ request }) => {
      const email = `auth-${crypto.randomUUID()}@example.com`
      const password = "Voidmix-test-password-2026!"
      const response = await request.post(`${origin}/api/auth/sign-up/email`, {
        headers: { Origin: origin },
        data: { name: "Auth Tester", email, password },
      })
      expect(response.status()).toBe(200)

      const cookie = await sessionCookie(request)
      const client = createApiClient(`${origin}/api/rpc`, {
        headers: () => new Headers({ cookie }),
      })
      const user = await client.me()
      expect(user).toMatchObject({ name: "Auth Tester", email, image: null })

      const session = await request.get(`${origin}/api/auth/get-session`)
      expect(await session.json()).toMatchObject({ user: { id: user.id, email } })

      const signOut = await request.post(`${origin}/api/auth/sign-out`, {
        headers: { Origin: origin },
        data: {},
      })
      expect(signOut.status()).toBe(200)
      expect(await (await request.get(`${origin}/api/auth/get-session`)).json()).toBeNull()
      // 重放退出前的 Cookie 也必须失败，验证服务端撤销。
      await expect(client.me()).rejects.toMatchObject({ status: 401 })

      const wrongPassword = await request.post(`${origin}/api/auth/sign-in/email`, {
        headers: { Origin: origin },
        data: { email, password: "Incorrect-password-2026!" },
      })
      expect(wrongPassword.status()).toBe(401)

      const signIn = await request.post(`${origin}/api/auth/sign-in/email`, {
        headers: { Origin: origin },
        data: { email, password },
      })
      expect(signIn.status()).toBe(200)
      expect(await sessionCookie(request)).not.toBe(cookie)
      expect(await (await request.get(`${origin}/api/auth/get-session`)).json()).toMatchObject({
        user: { id: user.id, email },
      })
    })
  })
}

test("认证跨域预检允许携带 Cookie", async ({ request }) => {
  const response = await request.fetch(`${apiOrigin}/api/auth/sign-in/email`, {
    method: "OPTIONS",
    headers: {
      Origin: mobileOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  })
  expect(response.status()).toBe(204)
  expect(response.headers()["access-control-allow-origin"]).toBe(mobileOrigin)
  expect(response.headers()["access-control-allow-credentials"]).toBe("true")
})

test("短密码不能注册", async ({ request }) => {
  const response = await request.post(`${apiOrigin}/api/auth/sign-up/email`, {
    headers: { Origin: apiOrigin },
    data: {
      name: "Short Password",
      email: `short-${crypto.randomUUID()}@example.com`,
      password: "short",
    },
  })
  expect(response.status()).toBe(400)
  expect(await (await request.get(`${apiOrigin}/api/auth/get-session`)).json()).toBeNull()
})

test("浏览器保留 HttpOnly 会话并拒绝陌生来源退出", async ({ page }) => {
  const email = `browser-${crypto.randomUUID()}@example.com`
  const response = await page.request.post(`${webOrigin}/api/auth/sign-up/email`, {
    headers: { Origin: webOrigin },
    data: { name: "Browser Tester", email, password: "Voidmix-browser-password-2026!" },
  })
  expect(response.status()).toBe(200)
  await page.goto("/")

  const result = await page.evaluate(async () => {
    const response = await fetch("/api/auth/get-session")
    return { status: response.status, body: await response.json(), cookies: document.cookie }
  })
  expect(result.status).toBe(200)
  expect(result.body).toMatchObject({ user: { email } })
  expect(result.cookies).not.toContain("session_token")

  const rejected = await page.request.post(`${webOrigin}/api/auth/sign-out`, {
    headers: { Origin: "https://unlisted.example.com" },
    data: {},
  })
  expect(rejected.status()).toBe(403)
  expect(await (await page.request.get(`${webOrigin}/api/auth/get-session`)).json()).toMatchObject({
    user: { email },
  })
})
