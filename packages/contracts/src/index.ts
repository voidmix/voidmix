import { z } from 'zod'
export const errorCode = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'BAD_REQUEST',
  'NOT_FOUND',
  'CONFLICT',
  'TOO_MANY_REQUESTS',
  'INTERNAL_SERVER_ERROR',
  'SERVICE_UNAVAILABLE',
])
export type ErrorCode = z.infer<typeof errorCode>
export const apiError = z.object({
  code: errorCode,
  message: z.string(),
  requestId: z.string().optional(),
})
export type ApiError = z.infer<typeof apiError>
export const errorStatus: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
}
export const pageInput = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().max(256).optional(),
    sort: z.literal('newest').default('newest'),
    filter: z.object({ contentType: z.string().max(100).optional() }).optional(),
  })
  .default({ limit: 20, sort: 'newest' })
export const uploadInput = z.object({
  fileName: z
    .string()
    .min(1)
    .max(255)
    .refine(
      (value) =>
        value !== '.' &&
        value !== '..' &&
        [...value].every(
          (char) =>
            char !== '/' && char !== '\\' && char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
        ),
      'Invalid file name',
    ),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain']),
  size: z
    .number()
    .int()
    .positive()
    .max(1024 * 1024 * 1024),
})
export type UploadInput = z.infer<typeof uploadInput>
export const fileIdInput = z.object({ id: z.string().uuid() })
export const fileSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  contentType: z.string(),
  size: z.number(),
  status: z.enum(['pending', 'ready', 'deleting', 'deleted']),
  createdAt: z.string(),
})
export type FileDto = z.infer<typeof fileSchema>
export const filePageSchema = z.object({
  items: z.array(fileSchema),
  nextCursor: z.string().optional(),
})
export type FilePage = z.infer<typeof filePageSchema>
export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
})
export type SessionUser = z.infer<typeof sessionUserSchema>
export const jobSchemas = {
  'send-email': z.object({ to: z.string().email(), subject: z.string(), text: z.string() }),
  'process-upload': fileIdInput,
  'cleanup-upload': z.object({ key: z.string().min(1) }),
  'delete-file': fileIdInput,
  audit: z.object({
    actorId: z.string().optional(),
    action: z.string(),
    resource: z.string(),
    requestId: z.string().optional(),
  }),
}
export type JobName = keyof typeof jobSchemas
export type JobPayload<N extends JobName> = z.infer<(typeof jobSchemas)[N]>
