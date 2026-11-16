import { afterEach, expect, test } from "bun:test"

import { configureLogger, createLogger } from "../src"
import { createOtlpLogDrain } from "../src/otlp"

const original = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

afterEach(() => {
  if (original === undefined) delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  else process.env.OTEL_EXPORTER_OTLP_ENDPOINT = original
  configureLogger("voidmix-test", { env: { NODE_ENV: "test" }, silent: true, drain: () => {} })
})

test("the exporter is disabled without an endpoint and rejects non-HTTP endpoints", () => {
  expect(createOtlpLogDrain({})).toBeUndefined()
  expect(createOtlpLogDrain({ OTEL_EXPORTER_OTLP_ENDPOINT: "  " })).toBeUndefined()
  expect(() => createOtlpLogDrain({ OTEL_EXPORTER_OTLP_ENDPOINT: "collector:4318" })).toThrow(
    "OTEL_EXPORTER_OTLP_ENDPOINT",
  )
  expect(() => createOtlpLogDrain({ OTEL_EXPORTER_OTLP_ENDPOINT: "not a url" })).toThrow(
    "OTEL_EXPORTER_OTLP_ENDPOINT",
  )
})

test("flush delivers buffered, already-redacted events to the collector in one request", async () => {
  const requests: { path: string; body: string }[] = []
  // A loopback collector stand-in; nothing leaves the machine.
  const collector = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      requests.push({ path: new URL(request.url).pathname, body: await request.text() })
      return new Response("{}", { headers: { "Content-Type": "application/json" } })
    },
  })
  try {
    // evlog's exporter resolves the standard variable from the process environment.
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://127.0.0.1:${collector.port}`
    const drain = createOtlpLogDrain()!
    configureLogger("voidmix-otlp-test", { env: { NODE_ENV: "test" }, silent: true, drain })
    for (const step of ["first", "second"]) {
      const job = createLogger({ action: `otlp.${step}` })
      job.set({ credentials: { password: "test-only-secret" } })
      job.emit()
    }
    expect(requests).toHaveLength(0)
    await drain.flush()
    expect(requests).toHaveLength(1)
    expect(requests[0]!.path).toBe("/v1/logs")
    expect(requests[0]!.body).toContain("voidmix-otlp-test")
    expect(requests[0]!.body).toContain("otlp.first")
    expect(requests[0]!.body).toContain("otlp.second")
    expect(requests[0]!.body).not.toContain("test-only-secret")
  } finally {
    await collector.stop(true)
  }
})
