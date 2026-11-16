import type { DrainContext } from "evlog"
import { createOTLPDrain } from "evlog/otlp"
import { createDrainPipeline } from "evlog/pipeline"

type Environment = Record<string, string | undefined>

/**
 * Build a batched OTLP/HTTP log drain when an OpenTelemetry endpoint is configured; return
 * `undefined` otherwise. Events have already been redacted by the logger before they reach a
 * drain. The exporter reads the standard `OTEL_EXPORTER_OTLP_*`, `OTEL_SERVICE_NAME`, and
 * `OTEL_RESOURCE_ATTRIBUTES` process variables itself; `env` only decides whether to enable it.
 *
 * The caller owns the returned drain: pass it to `configureLogger` and await `flush()` during
 * shutdown, or up to five seconds of buffered events are lost. Export failures are reported on
 * stderr and never fail a request; terminal output continues independently.
 */
export function createOtlpLogDrain(env: Environment = process.env) {
  const endpoint =
    env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT?.trim() || env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()
  if (!endpoint) return undefined
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error("OTEL_EXPORTER_OTLP_ENDPOINT 必须是有效的 HTTP(S) URL。")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OTEL_EXPORTER_OTLP_ENDPOINT 必须是有效的 HTTP(S) URL。")
  }

  const send = createOTLPDrain({ recordShape: "compact", semanticConventions: true })
  // One request per batch instead of per event; a bounded buffer drops the oldest on overflow.
  return createDrainPipeline<DrainContext>({
    batch: { size: 50, intervalMs: 5_000 },
    maxBufferSize: 1_000,
  })(async (batch) => {
    // evlog drains accept a batch at runtime; their public type names the single-event form.
    await (send as (contexts: DrainContext[]) => void | Promise<void>)(batch)
  })
}
