import { pingDatabase } from "@voidmix/db/client"
import { Hono } from "hono"

import type { ApiEnv, ApiServices } from "../lib/context"

const probeTimeoutMs = 2_000

/** Bound one dependency check; a failure is data for the report, never a thrown response. */
async function probe<T>(check: () => Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const value = await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Readiness probe timed out.")), probeTimeoutMs)
      }),
    ])
    return { value }
  } catch (error) {
    return { failure: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
  }
}

export function createHealthRoutes(services: ApiServices) {
  return (
    new Hono<ApiEnv>()
      // Liveness: never touches backends, so an outage cannot restart otherwise healthy processes.
      .get("/health", (c) => c.json({ status: "ok" }))
      // Readiness: only PostgreSQL gates traffic. The cache is optional and disposable, so its
      // state is reported without failing the probe. Acquisition throws once shutdown begins,
      // which takes a draining process out of rotation.
      .get("/ready", async (c) => {
        const [database, cache] = await Promise.all([
          probe(async () => pingDatabase(services.database)),
          probe(async () => {
            const client = await services.getCache()
            if (!client) return "disabled" as const
            await client.ping()
            return "ok" as const
          }),
        ])
        const ready = !("failure" in database)
        if (!ready || "failure" in cache) {
          // Causes stay on the server-side request event; the response carries states only.
          c.get("log").set({
            readiness: {
              database: "failure" in database ? database.failure : undefined,
              cache: "failure" in cache ? cache.failure : undefined,
            },
          })
        }
        return c.json(
          {
            status: ready ? "ready" : "unavailable",
            checks: {
              database: ready ? "ok" : "unavailable",
              cache: "failure" in cache ? "unavailable" : cache.value,
            },
          },
          ready ? 200 : 503,
        )
      })
  )
}
