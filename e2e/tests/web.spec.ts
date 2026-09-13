import { expect, test } from "@playwright/test";

test("renders the public workspace home", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Voidmix/);
  await expect(page.getByRole("heading", { name: /Generate and ship/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start free/i })).toBeVisible();
});

test("redirects unauthenticated Project Studio routes to sign in", async ({ page }) => {
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
