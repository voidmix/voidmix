import { strict as assert } from "node:assert"

function origin(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`请为独立测试部署设置 ${name}。`)
  const url = new URL(value)
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("部署冒烟测试只允许本机 HTTP 测试实例。")
  }
  return url.origin
}

const web = origin("DOCKER_TEST_WEB_ORIGIN")
const api = origin("DOCKER_TEST_API_ORIGIN")
const fetchTest = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(10_000) })
const health = await fetchTest(`${api}/health`)
assert.equal(health.status, 200)
assert.deepEqual(await health.json(), { status: "ok" })
// The deployment always runs PostgreSQL and Redis, so both dependencies must report ok.
const ready = await fetchTest(`${api}/ready`)
assert.equal(ready.status, 200)
assert.deepEqual(await ready.json(), {
  status: "ready",
  checks: { database: "ok", cache: "ok" },
})
const homepage = await fetchTest(web)
assert.equal(homepage.status, 200)
assert(
  (await homepage.text()).includes("这条消息来自 oRPC"),
  "Web SSR did not call the container API",
)

for (const base of [web, api]) {
  const response = await fetchTest(`${base}/api/rpc/greet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { name: "Docker" } }),
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    json: { message: "你好，Docker！这条消息来自 oRPC。" },
  })
}

const email = `docker-${crypto.randomUUID()}@example.test`
const response = await fetchTest(`${web}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: web },
  body: JSON.stringify({ name: "Docker Smoke", email, password: crypto.randomUUID() }),
})
assert.equal(response.status, 200, "Database migration or auth proxy failed")
const cookies = response.headers.getSetCookie()
assert(
  cookies.some((cookie) => cookie.includes("HttpOnly")),
  "Auth cookie is not HttpOnly",
)
const cookie = cookies.map((value) => value.split(";")[0]).join("; ")
const session = await fetchTest(`${web}/api/auth/get-session`, { headers: { Cookie: cookie } })
assert.equal(session.status, 200)
assert.equal(((await session.json()) as { user: { email: string } }).user.email, email)
const logout = await fetchTest(`${web}/api/auth/sign-out`, {
  method: "POST",
  headers: { Origin: web, Cookie: cookie, "Content-Type": "application/json" },
  body: "{}",
})
assert.equal(logout.status, 200)
const revoked = await fetchTest(`${web}/api/auth/get-session`, { headers: { Cookie: cookie } })
assert.equal(await revoked.json(), null)
console.log("Docker API、Web SSR、oRPC、数据库迁移、认证代理与会话撤销验证通过。")
