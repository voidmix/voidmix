import { describe, expect, it } from 'vitest'
import { getServerConfig } from './server'
import { parsePublicConfig } from './client'
describe('configuration boundaries', () => {
  it('does not leak supplied secrets in startup errors', () => {
    const secret = 'sensitive-value'
    try {
      getServerConfig({ BETTER_AUTH_SECRET: secret })
    } catch (error) {
      expect(String(error)).not.toContain(secret)
      expect(String(error)).toContain('DATABASE_URL')
    }
  })
  it('strips server fields from public configuration', () => {
    expect(
      parsePublicConfig({
        appName: 'Voidmix',
        DATABASE_URL: 'secret',
        BETTER_AUTH_SECRET: 'secret',
      }),
    ).toEqual({ appName: 'Voidmix' })
  })
})
