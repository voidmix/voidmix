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

test("redirects unauthenticated Project Studio routes to sign in", async ({ page }) => {
  await page.goto("/projects");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fprojects/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("keeps the desktop workspace navbar pinned while scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");

  const navbar = page.locator("header").first();
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

    let releaseScripts = () => {};
    const scriptsReady = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() === "script") await scriptsReady;
      await route.continue();
    });

    try {
      await page.goto("/", { waitUntil: "commit" });
      const loading = page.getByRole("status", { name: "Loading your workspace…" });
      const command = page.getByRole("textbox", { name: "Ask Voidmix" });
      const title = page.getByRole("heading", { name: "What will you move forward?" });
      const footer = page.getByRole("contentinfo");
      await expect(loading).toHaveCount(0);
      await expect(title).toBeVisible();
      await expect(command).toBeVisible();
      await expect(command).toBeEnabled();
      await expect(page.getByRole("combobox", { name: "Project context" })).toBeEnabled();
      await expect(page.getByRole("button", { name: "Continue with Pi" })).toBeDisabled();
      await page.evaluate("document.fonts.ready");
      const commandBounds = await command.boundingBox();
      const loadingBounds = await footer.boundingBox();
      expect(loadingBounds).not.toBeNull();

      releaseScripts();
      await expect(loading).toHaveCount(0);
      await expect(command).toBeEnabled();
      expect(await command.boundingBox()).toEqual(commandBounds);
      const readyBounds = await footer.boundingBox();
      expect(readyBounds).not.toBeNull();
      expect(Math.abs(readyBounds!.y - loadingBounds!.y)).toBeLessThan(1);
      expect(readyBounds!.height).toBe(loadingBounds!.height);
    } finally {
      releaseScripts();
      await page.unrouteAll({ behavior: "wait" });
    }
  });
}
