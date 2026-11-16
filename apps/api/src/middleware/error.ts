import type { ErrorHandler } from "hono"
import { HTTPException } from "hono/http-exception"

import type { ApiEnv } from "../lib/context"

export const errorHandler: ErrorHandler<ApiEnv> = (error, c) => {
  if (error instanceof HTTPException) return error.getResponse()
  // evlog captures c.error on the same request event.
  return c.text("Internal Server Error", 500)
}
