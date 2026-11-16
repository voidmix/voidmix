import { toMiddlewareOptions } from "@voidmix/logger"
import { evlog } from "@voidmix/logger/hono"
import { createMiddleware } from "hono/factory"
import { requestId } from "hono/request-id"

import { loggerConfig } from "../lib/logger"
import type { ApiEnv } from "../lib/context"

export const loggerMiddleware = [
  requestId({ limitLength: 128 }),
  evlog(toMiddlewareOptions(loggerConfig)),
  createMiddleware<ApiEnv>(async (c, next) => {
    const log = c.get("log")
    // Use Hono's validated ID for both the response header and the wide event.
    log.set({ requestId: c.get("requestId") })
    await next()
    if (c.res.status >= 500) log.setLevel("error")
    else if (c.res.status >= 400) log.setLevel("warn")
  }),
] as const
