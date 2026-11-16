import { expect, test } from "@playwright/test"

test.describe("服务端渲染", () => {
  test.use({ javaScriptEnabled: false })

  test("禁用 JavaScript 后仍能看到 API 返回的首屏内容", async ({ page }) => {
    const response = await page.goto("/")

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Voidmix" })).toBeVisible()
    await expect(
      page.getByText("你好，Voidmix！这条消息来自 oRPC。", { exact: true }),
    ).toBeVisible()
  })
})

test("计数器可以递增并重置", async ({ page }) => {
  await page.goto("/")

  const reset = page.getByRole("button", { name: "重置", exact: true })
  await expect(reset).toBeDisabled()

  await page.getByRole("button", { name: "点击计数 0", exact: true }).click()
  await expect(page.getByRole("button", { name: "点击计数 1", exact: true })).toBeVisible()
  await expect(reset).toBeEnabled()

  await page.getByRole("button", { name: "点击计数 1", exact: true }).click()
  await expect(page.getByRole("button", { name: "点击计数 2", exact: true })).toBeVisible()

  await reset.click()
  await expect(page.getByRole("button", { name: "点击计数 0", exact: true })).toBeVisible()
  await expect(reset).toBeDisabled()
})

test("浏览器通过 Web 代理调用独立 oRPC API", async ({ page }) => {
  await page.goto("/")

  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/rpc/greet" &&
      response.request().method() === "POST",
  )
  const button = page.getByRole("button", { name: "调用 oRPC", exact: true })
  await button.click()

  const response = await responsePromise
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({
    json: { message: "你好，Voidmix！这条消息来自 oRPC。" },
  })
  await expect(page.getByText("你好，Voidmix！这条消息来自 oRPC。", { exact: true })).toBeVisible()
  await expect(button).toBeEnabled()
})
