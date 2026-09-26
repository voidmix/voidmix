import { expect, test } from "@playwright/test";

test("navigates Desktop and preserves settings, theme and keyboard controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your studio is in motion" })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await navigation.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByLabel("Project folder")).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("main").getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const toggle = page.getByRole("switch", { name: "Start with the system" });
  const previous = await toggle.getAttribute("aria-checked");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", previous === "true" ? "false" : "true");
  await navigation.getByRole("link", { name: "Projects" }).click();
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Project folder")).toBeVisible();
});
