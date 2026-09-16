import { expect, test } from "@playwright/test";

test("renders the public workspace home", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Voidmix/);
  await expect(page.getByRole("heading", { name: /Generate and ship/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start free/i })).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`switches and remembers the home language at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: "Language: English" }).click();
    await page.getByRole("menuitemradio", { name: "简体中文" }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await expect(
      page.getByRole("heading", { name: "用自然语言，生成并完成你的下一个应用" }),
    ).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.getByRole("button", { name: "语言: 简体中文" }).click();
    await page.getByRole("menuitemradio", { name: "英语" }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: /Generate and ship/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Language: English" })).toBeVisible();
  });
}

test("redirects unauthenticated project access to sign in", async ({ page }) => {
  await page.goto("/projects");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fprojects/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("keeps the desktop workspace navbar pinned while scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");

  const navbar = page.locator("nav").first();
  await expect(navbar).toBeVisible();
  await page.evaluate("window.scrollTo(0, 300)");

  await expect.poll(async () => (await navbar.boundingBox())?.y ?? -1).toBe(0);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
]) {
  test(`keeps the home footer stable during hydration at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Generate and ship/i })).toBeVisible();
  });
}
