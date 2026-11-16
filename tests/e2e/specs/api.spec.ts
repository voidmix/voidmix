import { expect, test } from "@playwright/test"
import { createApiClient } from "@voidmix/api/client"

import { apiOrigin, mobileOrigin, webOrigin } from "../environment"

test("独立 API 健康检查", async ({ request }) => {
  const response = await request.get(`${apiOrigin}/health`)

  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: "ok" })
})

test("就绪检查确认数据库可用", async ({ request }) => {
  const response = await request.get(`${apiOrigin}/ready`)

  expect(response.status()).toBe(200)
  // Redis is optional in E2E, so only the gating dependency is asserted.
  expect(await response.json()).toMatchObject({ status: "ready", checks: { database: "ok" } })
})

test("允许 Expo Web 的跨域预检", async ({ request }) => {
  const response = await request.fetch(`${apiOrigin}/api/rpc/greet`, {
    method: "OPTIONS",
    headers: {
      Origin: mobileOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  })

  expect(response.status()).toBe(204)
  expect(response.headers()["access-control-allow-origin"]).toBe(mobileOrigin)
  expect(response.headers()["access-control-allow-methods"]).toContain("POST")
  expect(response.headers()["access-control-allow-headers"]?.toLowerCase()).toContain(
    "content-type",
  )
})

test("未配置的来源不获得跨域许可", async ({ request }) => {
  const response = await request.fetch(`${apiOrigin}/api/rpc/greet`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://unlisted.example.com",
      "Access-Control-Request-Method": "POST",
    },
  })

  expect(response.headers()["access-control-allow-origin"]).toBeUndefined()
})

for (const [name, origin] of [
  ["独立 API", apiOrigin],
  ["Web 代理", webOrigin],
] as const) {
  test.describe(name, () => {
    const client = createApiClient(`${origin}/api/rpc`)

    test("回传请求 ID，并替换无效的关联 ID", async ({ request }) => {
      const requestId = crypto.randomUUID()
      for (const value of [requestId, "invalid request id"]) {
        const response = await request.post(`${origin}/api/rpc/greet`, {
          headers: { "X-Request-Id": value },
          data: { json: { name: "Logger" } },
        })
        expect(response.status()).toBe(200)
        const received = response.headers()["x-request-id"]
        if (value === requestId) expect(received).toBe(requestId)
        else expect(received).toMatch(/^[a-f0-9-]{36}$/)
      }
    })

    test("通过共享客户端调用 greet，并去除姓名两侧空格", async () => {
      await expect(client.greet({ name: "  Codex  " })).resolves.toEqual({
        message: "你好，Codex！这条消息来自 oRPC。",
      })
    })

    for (const [label, value] of [
      ["空白姓名", "   "],
      ["超过 80 字符的姓名", "a".repeat(81)],
    ] as const) {
      test(`${label}返回 400`, async () => {
        await expect(client.greet({ name: value })).rejects.toMatchObject({
          code: "BAD_REQUEST",
          status: 400,
        })
      })
    }

    test("未知 RPC 路径返回 404", async ({ request }) => {
      const response = await request.post(`${origin}/api/rpc/unknown`, {
        data: { json: {} },
      })

      expect(response.status()).toBe(404)
    })
  })
}
