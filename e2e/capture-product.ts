import { chromium } from "@playwright/test";
import { connectDatabase, migrateDatabase } from "@voidmix/db";
import { authAccounts, users, v2Projects, v2ProjectTasks } from "@voidmix/db/schema";
import { hashPassword } from "better-auth/crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { databaseUrl, password } from "./database.js";

// Uses only the guarded test database and loopback application servers.
const port = Number(process.env.VOIDMIX_E2E_PORT ?? 3000);
const web = `http://127.0.0.1:${port}`;
const api = `http://127.0.0.1:${port + 2}`;
const output = resolve(import.meta.dirname, "../apps/web/public/product");
const connectionUrl = databaseUrl();
await migrateDatabase(connectionUrl);
const connection = connectDatabase(connectionUrl);
const browser = await chromium.launch();
await mkdir(output, { recursive: true });
try {
  const hash = await hashPassword(password);
  for (const locale of ["en", "zh"] as const) {
    const id = `visual-example-${locale}`;
    const email = `${id}@example.test`;
    await connection.db
      .insert(users)
      .values({
        id,
        email,
        displayName: locale === "en" ? "Avery Lin" : "林知夏",
        emailVerified: true,
      })
      .onConflictDoNothing();
    await connection.db
      .insert(authAccounts)
      .values({ id, accountId: id, providerId: "credential", userId: id, password: hash })
      .onConflictDoNothing();
    const titles =
      locale === "en"
        ? [
            "Autumn collection",
            "Product launch",
            "Studio website",
            "Field notes",
            "Identity system",
          ]
        : ["秋日系列", "产品发布", "工作室网站", "调研笔记", "品牌视觉系统"];
    const descriptions =
      locale === "en"
        ? [
            "A considered direction for the season ahead.",
            "Bring the next release into focus.",
            "A shared home for the studio's work.",
            "Observations that guide the next decision.",
            "A consistent voice across every touchpoint.",
          ]
        : [
            "为下一个季节，整理清晰的创作方向。",
            "梳理下一次发布的重点与准备工作。",
            "为工作室的作品建立共同的展示空间。",
            "记录观察，为下一步决策提供依据。",
            "在每个触点，保持一致的视觉表达。",
          ];
    for (let index = 0; index < titles.length; index++) {
      await connection.db
        .insert(v2Projects)
        .values({
          id: `${id}-${index}`,
          title: titles[index]!,
          description: descriptions[index]!,
          createdByUserId: id,
          personalOwnerId: id,
          stage: (["in_progress", "review", "draft", "delivered", "draft"] as const)[index]!,
          createdAt: new Date("2026-09-01T00:00:00Z"),
          updatedAt: new Date(`2026-09-${28 - index}T08:00:00Z`),
          deadline: index === 0 ? new Date("2026-10-12T00:00:00Z") : null,
        })
        .onConflictDoNothing();
    }
    const tasks =
      locale === "en"
        ? [
            "Confirm the creative direction",
            "Prepare the first concept",
            "Review the visual references",
            "Document the final decisions",
          ]
        : ["确认创作方向", "准备第一版方案", "评审视觉参考", "整理最终决策"];
    for (let index = 0; index < tasks.length; index++)
      await connection.db
        .insert(v2ProjectTasks)
        .values({
          id: `${id}-task-${index}`,
          projectId: `${id}-0`,
          title: tasks[index]!,
          status: (["done", "in_progress", "todo", "todo"] as const)[index]!,
          createdByUserId: id,
          createdAt: new Date("2026-09-01T00:00:00Z"),
          updatedAt: new Date(`2026-09-${28 - index}T08:00:00Z`),
        })
        .onConflictDoNothing();
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      locale,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await context.addCookies([{ name: "locale", value: locale, url: web }]);
    const response = await context.request.post(`${api}/api/auth/sign-in/email`, {
      data: { email, password },
      headers: { origin: api },
    });
    if (!response.ok()) throw new Error(`Test sign-in failed: ${response.status()}`);
    const page = await context.newPage();
    for (const [name, route, heading] of [
      ["projects", "/projects", locale === "en" ? "Projects" : "项目"],
      ["detail", `/projects/${id}-0`, titles[0]!],
    ] as const) {
      await page.goto(`${web}${route}`);
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await page
        .getByRole("button", { name: locale === "en" ? "Open account menu" : "打开账户菜单" })
        .waitFor();
      await page.screenshot({
        path: resolve(output, `${name}-${locale}.png`),
        animations: "disabled",
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
  await connection.close();
}
