import { describe, expect, it, vi } from 'vitest'
import {
  createFileService,
  validateUpload,
  type FileRecord,
  type FileRepository,
  type ObjectStorage,
} from './index'
const id = 'e133cdcc-6d5a-44af-8eaa-639ae2080111'
const file: FileRecord = {
  id,
  ownerId: 'alice',
  objectKey: 'files/alice/' + id,
  stagingKey: 'staging/alice/' + id,
  fileName: 'a.png',
  contentType: 'image/png',
  size: 10,
  status: 'pending',
  createdAt: new Date().toISOString(),
}
function fixture(record = file) {
  const repository: FileRepository = {
    create: vi.fn(),
    find: vi.fn(async (_, owner) => (owner === record.ownerId ? record : undefined)),
    list: vi.fn(async () => ({ items: [] })),
    complete: vi.fn(async (item) => ({ ...item, status: 'ready' })),
    remove: vi.fn(),
  }
  const storage: ObjectStorage = {
    createUploadUrl: vi.fn(async () => 'https://storage/upload'),
    stat: vi.fn(async () => ({ size: 10, contentType: 'image/png' })),
    promote: vi.fn(),
    createDownloadUrl: vi.fn(async () => 'https://storage/download'),
    deleteObject: vi.fn(),
    check: vi.fn(),
  }
  return {
    repository,
    storage,
    service: createFileService(repository, storage, { maxBytes: 20, audit: vi.fn() }),
  }
}
describe('file lifecycle', () => {
  it('validates extension and per-deployment upload budget', () => {
    expect(() =>
      validateUpload({ ...file, contentType: 'image/png', fileName: 'a.html' }, 20),
    ).toThrow()
    expect(() => validateUpload({ ...file, contentType: 'image/png' }, 5)).toThrow()
  })
  it('hides files belonging to another user', async () => {
    const { service, storage } = fixture()
    await expect(service.complete('bob', id, 'req')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(storage.promote).not.toHaveBeenCalled()
  })
  it('refuses mismatched object metadata before committing a file', async () => {
    const { service, storage, repository } = fixture()
    vi.mocked(storage.stat).mockResolvedValue({ size: 11, contentType: 'image/png' })
    await expect(service.complete('alice', id, 'req')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    expect(repository.complete).not.toHaveBeenCalled()
  })
  it('promotes validated staging objects and makes repeated completion idempotent', async () => {
    const { service, storage, repository } = fixture()
    await expect(service.complete('alice', id, 'req')).resolves.toMatchObject({ status: 'ready' })
    expect(storage.promote).toHaveBeenCalledWith(file.stagingKey, file.objectKey)
    expect(repository.complete).toHaveBeenCalledOnce()
    const ready = fixture({ ...file, status: 'ready' })
    await ready.service.complete('alice', id, 'req')
    expect(ready.storage.promote).not.toHaveBeenCalled()
  })
  it('does not issue a download URL for incomplete files', async () => {
    await expect(fixture().service.download('alice', id, 'req')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })
})
