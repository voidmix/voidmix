import { expect, test } from "@playwright/test"

import { apiOrigin } from "../environment"

test("Expo 首页计数器可以递增并重置", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Voidmix", exact: true })).toBeVisible()

  const reset = page.getByRole("button", { name: "重置", exact: true })
  await expect(reset).toBeDisabled()
  await page.getByRole("button", { name: "点击计数 0", exact: true }).click()
  await expect(page.getByRole("button", { name: "点击计数 1", exact: true })).toBeVisible()
  await reset.click()
  await expect(page.getByRole("button", { name: "点击计数 0", exact: true })).toBeVisible()
  await expect(reset).toBeDisabled()
})

test("Expo 通过共享客户端跨域调用独立 oRPC API", async ({ page }) => {
  await page.goto("/")

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${apiOrigin}/api/rpc/greet` && response.request().method() === "POST",
  )
  await page.getByRole("button", { name: "调用 oRPC", exact: true }).click()

  expect((await responsePromise).status()).toBe(200)
  await expect(page.getByText("你好，Voidmix！这条消息来自 oRPC。", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "调用 oRPC", exact: true })).toBeEnabled()
})

test("Expo 离线请求显示错误并允许重试", async ({ page, context }) => {
  await page.goto("/")
  const button = page.getByRole("button", { name: "调用 oRPC", exact: true })
  await expect(button).toBeVisible()
  await context.setOffline(true)
  await button.click()

  await expect(
    page.getByText("连接失败，请确认 API 服务已启动后重试。", { exact: true }),
  ).toBeVisible()
  await expect(button).toBeEnabled()

  await context.setOffline(false)
  await button.click()
  await expect(page.getByText("你好，Voidmix！这条消息来自 oRPC。", { exact: true })).toBeVisible()
})

test("通过网页登录与确认授权建立移动端会话，并撤销退出", async ({ page }) => {
  await page.goto("/")
  const popupPromise = page.waitForEvent("popup")
  await page.getByRole("button", { name: "打开网页登录" }).click()
  const popup = await popupPromise
  await popup.getByRole("button", { name: "没有账户，创建一个" }).click()
  const email = `mobile-device-${crypto.randomUUID()}@example.com`
  await popup.getByLabel("姓名", { exact: true }).fill("Mobile Tester")
  await popup.getByLabel("邮箱", { exact: true }).fill(email)
  await popup.getByLabel("密码", { exact: true }).fill("Voidmix-mobile-password-2026!")
  await popup.getByRole("button", { name: "创建账户", exact: true }).click()
  await popup.getByRole("button", { name: "核对授权码" }).click()
  await popup.getByRole("button", { name: "允许登录" }).click()
  await expect(page.getByText(email, { exact: false })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole("button", { name: "退出登录" })).toBeVisible()
  await page.getByRole("button", { name: "退出登录" }).click()
  await expect(page.getByRole("button", { name: "打开网页登录" })).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
})

test("关闭授权窗口后可重新登录", async ({ page }) => {
  await page.goto("/")
  const popupPromise = page.waitForEvent("popup")
  await page.getByRole("button", { name: "打开网页登录" }).click()
  const popup = await popupPromise
  await expect(popup.getByRole("heading", { name: "登录 Voidmix" })).toBeVisible()
  await popup.close()
  await expect(page.getByText("登录已取消。", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "打开网页登录" })).toBeEnabled()
})
