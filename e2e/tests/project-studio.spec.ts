import { expect, test } from "../fixtures/project-studio.js";

test("opens an authenticated project and shows its current work", async ({ page }) => {
  await page.goto("/projects");

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects" }).first()).toBeVisible();
  const projectCard = page.locator("main").getByRole("link", { name: /E2E Launch Film/ });
  await expect(projectCard).toBeVisible();

  await projectCard.click();

  await expect(page).toHaveURL(/\/projects\/project-e2e\?tab=overview&filter=all/);
  await expect(page.getByRole("heading", { name: "E2E Launch Film" }).first()).toBeVisible();
  await expect(
    page.locator("main").getByText("A focused brief for the launch film.").last(),
  ).toBeVisible();
  await expect(page.getByText("0 of 1 tasks complete")).toBeVisible();
});

test("searches the authenticated Library and opens a project brief", async ({ page }) => {
  await page.goto("/library");

  await expect(page.getByRole("heading", { name: "Your creative library" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search your library…" });
  await expect(search).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  const libraryBrief = page.locator("main").getByRole("link", { name: /E2E Launch Film/ });
  await expect(libraryBrief).toBeVisible();

  const fileInput = page.getByLabel("Upload file");
  await expect(fileInput).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  await fileInput.setInputFiles({
    name: "storyboard.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("e2e"),
  });
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();

  await search.fill("does-not-exist");
  await expect(page.getByText("No library items found")).toBeVisible();

  await search.fill("launch film");
  await libraryBrief.click();

  await expect(page).toHaveURL(/\/projects\/project-e2e\?tab=overview&filter=all/);
  await expect(page.getByRole("heading", { name: "E2E Launch Film" }).first()).toBeVisible();
});
