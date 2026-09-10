import { z } from 'zod'
export const desktopConfigSchema = z.object({
  apiUrl: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url),
      'Use HTTPS outside localhost',
    ),
})
export type DesktopConfig = z.infer<typeof desktopConfigSchema>
export const parseDesktopConfig = (input: unknown) => desktopConfigSchema.parse(input)
