import { expect, test } from "@playwright/test";

test("renders the Admin user directory", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Voidmix Control");
  await expect(page.getByRole("heading", { name: "User directory" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("admin@voidmix.local")).toBeVisible();
});
