import { expect, test } from "@playwright/test";

test("renders the public workspace home", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Voidmix/);
  await expect(page.getByRole("textbox", { name: "Ask Voidmix" })).toBeVisible();

  const sidebar = page.getByRole("complementary", { name: "Workspace" });
  await expect(sidebar.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Create account" })).toHaveCount(0);
});

test("keeps the desktop workspace navbar pinned while scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");

  const navbar = page.locator("header").first();
  await expect(navbar).toBeVisible();
  await page.evaluate("window.scrollTo(0, 300)");

  await expect.poll(async () => (await navbar.boundingBox())?.y ?? -1).toBe(0);
});
