import { expect, test } from "@playwright/test";

test("renders the public workspace home", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Voidmix/);
  await expect(page.getByRole("heading", { name: /Turn creative chaos/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Product", exact: true })).toBeVisible();
});
