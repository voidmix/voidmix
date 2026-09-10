import { z } from 'zod'
export const publicConfigSchema = z.object({
  appName: z.string().default('Voidmix'),
  apiUrl: z.string().url().optional(),
})
export type PublicConfig = z.infer<typeof publicConfigSchema>
export const parsePublicConfig = (input: unknown): PublicConfig => publicConfigSchema.parse(input)
