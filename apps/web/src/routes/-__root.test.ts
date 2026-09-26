import { describe, expect, it } from "vite-plus/test";

import { messages } from "../../tests/fixtures/messages";

import { Route } from "./__root";

describe("web root route", () => {
  it.each([
    [
      "en",
      "Voidmix | Creative work, one live signal",
      "Voidmix keeps briefs, feedback, decisions, people, and delivery visible in one live creative workspace.",
    ],
    [
      "zh",
      "Voidmix | 创意工作，一个实时信号",
      "Voidmix 让简报、反馈、决策、协作者和交付状态在一个实时创意工作空间中清晰可见。",
    ],
  ] as const)(
    "defines the root route and %s public metadata",
    async (locale, title, description) => {
      const head = await Route.options.head?.({
        loaderData: { locale, messages: messages[locale], theme: "system" },
      } as never);
      expect(Route.isRoot).toBe(true);
      expect(Route.options.errorComponent).toBeDefined();
      expect(Route.options.notFoundComponent).toBeDefined();
      expect(head?.meta).toEqual(
        expect.arrayContaining([{ title }, { name: "description", content: description }]),
      );
      expect(head?.links).toContainEqual(
        expect.objectContaining({
          href: `/manifest.webmanifest?locale=${locale}`,
          rel: "manifest",
        }),
      );
    },
  );
});
