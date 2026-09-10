import { describe, expect, it } from 'vitest'
import { uploadInput, apiError } from './index'
describe('upload metadata', () => {
  it.each(['../photo.png', 'dir/photo.png', 'dir\\photo.png', 'bad\u0000.png'])(
    'rejects unsafe file name %s',
    (fileName) => {
      expect(uploadInput.safeParse({ fileName, contentType: 'image/png', size: 10 }).success).toBe(
        false,
      )
    },
  )
  it('rejects active content and unbounded sizes', () => {
    expect(
      uploadInput.safeParse({ fileName: 'attack.html', contentType: 'text/html', size: 10 })
        .success,
    ).toBe(false)
    expect(
      uploadInput.safeParse({ fileName: 'file.txt', contentType: 'text/plain', size: 2 ** 31 })
        .success,
    ).toBe(false)
  })
  it('accepts canonical errors', () => {
    expect(apiError.parse({ code: 'UNAUTHORIZED', message: 'Sign in' }).code).toBe('UNAUTHORIZED')
  })
})
