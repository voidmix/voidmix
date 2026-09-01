import { expect, test } from "@playwright/test";

test("renders the public workspace home", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Voidmix/);
  await expect(page.getByRole("textbox", { name: "Ask Voidmix" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
    "href",
    "/signup",
  );
});
