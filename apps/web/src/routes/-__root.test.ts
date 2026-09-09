import { describe, expect, it } from "vite-plus/test";

import { messages } from "../../tests/fixtures/messages";

import { Route } from "./__root";

describe("web root route", () => {
  it("defines the root route and public metadata", async () => {
    const head = await Route.options.head?.({
      loaderData: { locale: "en", messages: messages.en, theme: "system" },
    } as never);

    expect(Route.isRoot).toBe(true);
    expect(Route.options.errorComponent).toBeDefined();
    expect(Route.options.notFoundComponent).toBeDefined();
    expect(head?.meta).toEqual(
      expect.arrayContaining([
        { title: "Voidmix | Creative work, one live signal" },
        {
          name: "description",
          content:
            "Voidmix keeps briefs, feedback, decisions, people, and delivery visible in one live creative workspace.",
        },
      ]),
    );
    expect(head?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/manifest.webmanifest?locale=en", rel: "manifest" }),
      ]),
    );
  });

  it("uses the negotiated catalog for Chinese metadata", async () => {
    const head = await Route.options.head?.({
      loaderData: { locale: "zh", messages: messages.zh, theme: "system" },
    } as never);

    expect(head?.meta).toEqual(
      expect.arrayContaining([
        { title: "Voidmix | 创意工作，一个实时信号" },
        {
          name: "description",
          content: "Voidmix 让简报、反馈、决策、协作者和交付状态在一个实时创意工作空间中清晰可见。",
        },
      ]),
    );
    expect(head?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/manifest.webmanifest?locale=zh", rel: "manifest" }),
      ]),
    );
  });
});
