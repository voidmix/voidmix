import { expect, test } from "@playwright/test"

import { desktopOrigin } from "../environment"

test("桌面产物为 SPA shell，客户端启动后计数和重置可用", async ({ page, request }) => {
  const response = await request.get(desktopOrigin)
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain("<title>Voidmix</title>")
  expect(html).not.toContain("点击计数")

  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Voidmix", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "重置", exact: true })).toBeDisabled()
  await page.getByRole("button", { name: "点击计数 0", exact: true }).click()
  await expect(page.getByRole("button", { name: "点击计数 1", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "重置", exact: true }).click()
  await expect(page.getByRole("button", { name: "点击计数 0", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "调用 Go", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "打开网页登录", exact: true })).toBeDisabled()
  expect(errors).toEqual([])
})

test("静态服务支持前端路由回退、刷新和返回首页", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const response = await page.goto("/unknown-desktop-route")
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: "未找到页面" })).toBeVisible()
  await page.reload()
  await expect(page.getByRole("heading", { name: "未找到页面" })).toBeVisible()
  await page.getByRole("link", { name: "返回首页" }).click()
  await expect(page).toHaveURL(`${desktopOrigin}/`)
  await expect(page.getByRole("button", { name: "点击计数 0", exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test("SPA 客户端启动后可调用 MyGo IPC 绑定（模拟原生桥）", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "mygo", {
      value: {
        call(method: string, ...args: unknown[]) {
          if (method === "NativeAuth.Session") return Promise.resolve(null)
          if (method === "Greeter.Greet")
            return Promise.resolve(`你好，${args[0]}！这条消息来自 Go。`)
          return Promise.reject(new Error(`Unexpected IPC call: ${method}`))
        },
      },
    })
  })
  await page.goto("/")
  await expect(page.getByRole("button", { name: "打开网页登录", exact: true })).toBeEnabled()
  await page.getByRole("button", { name: "调用 Go", exact: true }).click()
  await expect(page.getByText("你好，Voidmix！这条消息来自 Go。", { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
