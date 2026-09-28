import { expect, test } from "@playwright/test";

for (const scenario of [
  { width: 375, locale: "zh", theme: "dark" },
  { width: 768, locale: "en", theme: "light" },
  { width: 1280, locale: "zh", theme: "light" },
  { width: 1440, locale: "en", theme: "dark" },
] as const) {
  test(`homepage preview, keyboard and matching images ${scenario.width}/${scenario.locale}/${scenario.theme}`, async ({
    page,
    baseURL,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (/hydrat|server.rendered|didn't match/i.test(message.text())) errors.push(message.text());
    });
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await page.emulateMedia({ colorScheme: scenario.theme, reducedMotion: "reduce" });
    await page.context().addCookies([
      { name: "locale", value: scenario.locale, url: baseURL! },
      { name: "theme", value: scenario.theme, url: baseURL! },
    ]);
    await page.goto("/");
    await expect(
      page.getByRole("button", {
        name: scenario.locale === "en" ? "Language: English" : "语言: 简体中文",
      }),
    ).toBeEnabled();
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
    await expect(page.locator(".public-nav")).toHaveCSS("height", "64px");
    const tabs = page.getByRole("tablist");
    const first = tabs.getByRole("tab").first();
    const second = tabs.getByRole("tab").nth(1);
    await expect(first).toHaveAttribute("aria-selected", "true");
    const image = page.getByRole("tabpanel").locator("img");
    await expect
      .poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0))
      .toBe(true);
    expect(await image.evaluate((node) => node.currentSrc)).toContain(
      `projects-${scenario.locale}-${scenario.theme}${scenario.width < 768 ? "-mobile" : ""}.webp`,
    );
    await first.focus();
    await page.keyboard.press("ArrowRight");
    await expect(second).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect
      .poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0))
      .toBe(true);
    expect(await image.evaluate((node) => node.currentSrc)).toContain(
      `detail-${scenario.locale}-${scenario.theme}`,
    );
    await expect(page.locator('nav [data-slot="logo-mark"]')).toBeVisible();
    await expect(
      page.getByRole("link", { name: scenario.locale === "en" ? "Log in" : "登录", exact: true }),
    ).toHaveAttribute("href", "/login");
    expect(
      await page
        .locator("html")
        .evaluate((node) => node.scrollWidth <= node.ownerDocument.defaultView!.innerWidth),
    ).toBe(true);
    for (const preview of await page.locator(".product-picture img").all()) {
      await preview.scrollIntoViewIfNeeded();
      await expect
        .poll(() => preview.evaluate((node) => node.complete && node.naturalWidth > 0))
        .toBe(true);
    }
    await page
      .locator("html")
      .evaluate((node) =>
        node.ownerDocument.defaultView!.scrollTo({ top: 0, behavior: "instant" }),
      );
    await page.screenshot({ path: info.outputPath("home-detail.png"), fullPage: true });
    await first.click();
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect
      .poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0))
      .toBe(true);
    await image.evaluate((node) => node.decode());
    await page
      .locator("html")
      .evaluate((node) =>
        node.ownerDocument.defaultView!.scrollTo({ top: 0, behavior: "instant" }),
      );
    await page.screenshot({ path: info.outputPath("home-projects.png"), fullPage: true });
    expect(errors).toEqual([]);
  });
}
