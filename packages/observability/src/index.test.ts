import { expect, it } from 'vitest'
import { redact } from './index'
it('redacts nested credentials and signed URL query parameters', () => {
  const result = JSON.stringify(
    redact({
      user: { password: 'secret', sessionToken: 'secret' },
      url: 'https://bucket.example/file?X-Amz-Signature=secret',
      uploadUrl: 'https://secret',
      authorization: 'Bearer secret',
    }),
  )
  expect(result).not.toContain('secret')
  expect(result).toContain('[REDACTED]')
})
